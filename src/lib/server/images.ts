import { createServerFn } from '@tanstack/react-start'
import { and, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  shotImages,
} from '@/db/schema'
import {
  cleanupUncommittedUpload,
  type DatabaseTransaction,
  drainMediaCleanupQueue,
  queueMediaCleanup,
} from '@/lib/server/media-lifecycle.server'
import { generateAndUploadThumbnail } from '@/lib/server/thumbnails'
import {
  entityTypeSchema,
  imageBase64Schema,
  imageFilenameSchema,
  imageMimeTypeSchema,
  MAX_IMAGE_BYTES,
  positiveIdSchema,
  thumbnailEntityTypeSchema,
} from '@/lib/server-validation'
import { generateStoragePath, getStorage } from '@/lib/storage'
import { validateImageBuffer } from '@/lib/thumbnail-image'

export type EntityType = 'beans' | 'gear' | 'coffee-shops' | 'shots' | 'visits'
const MAX_IMAGES_PER_ENTITY = 20

const uploadEntityImageSchema = z.object({
  entityType: entityTypeSchema,
  entityId: positiveIdSchema,
  fileBase64: imageBase64Schema,
  filename: imageFilenameSchema,
  mimeType: imageMimeTypeSchema,
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
})

const entityImageIdSchema = z.object({
  entityType: entityTypeSchema,
  entityId: positiveIdSchema,
  imageId: positiveIdSchema,
})

const thumbnailImageIdSchema = entityImageIdSchema.extend({
  entityType: thumbnailEntityTypeSchema,
})

const storagePathTypeMap: Record<
  EntityType,
  'beans' | 'gear' | 'coffee-shops' | 'shots' | 'cafe-visits'
> = {
  beans: 'beans',
  gear: 'gear',
  'coffee-shops': 'coffee-shops',
  shots: 'shots',
  visits: 'cafe-visits',
}

async function getEntityImageCount(
  entityType: EntityType,
  entityId: number,
): Promise<number> {
  switch (entityType) {
    case 'beans':
      return (
        (
          await db
            .select({ value: count() })
            .from(beanImages)
            .where(eq(beanImages.beanId, entityId))
        )[0]?.value ?? 0
      )
    case 'gear':
      return (
        (
          await db
            .select({ value: count() })
            .from(gearImages)
            .where(eq(gearImages.gearId, entityId))
        )[0]?.value ?? 0
      )
    case 'coffee-shops':
      return (
        (
          await db
            .select({ value: count() })
            .from(coffeeShopImages)
            .where(eq(coffeeShopImages.coffeeShopId, entityId))
        )[0]?.value ?? 0
      )
    case 'shots':
      return (
        (
          await db
            .select({ value: count() })
            .from(shotImages)
            .where(eq(shotImages.shotId, entityId))
        )[0]?.value ?? 0
      )
    case 'visits':
      return (
        (
          await db
            .select({ value: count() })
            .from(cafeVisitImages)
            .where(eq(cafeVisitImages.cafeVisitId, entityId))
        )[0]?.value ?? 0
      )
  }
}

export const uploadEntityImage = createServerFn({ method: 'POST' })
  .validator(uploadEntityImageSchema)
  .handler(async ({ data }) => {
    if (
      (await getEntityImageCount(data.entityType, data.entityId)) >=
      MAX_IMAGES_PER_ENTITY
    ) {
      throw new Error(
        `An entity can have at most ${MAX_IMAGES_PER_ENTITY} images`,
      )
    }

    const storage = getStorage()
    const storagePathType = storagePathTypeMap[data.entityType]
    const storagePath = generateStoragePath(
      storagePathType,
      data.entityId,
      data.filename,
    )

    const binaryData = Buffer.from(data.fileBase64, 'base64')
    if (binaryData.byteLength !== data.sizeBytes) {
      throw new Error('Image size does not match the uploaded data')
    }
    await validateImageBuffer(binaryData, data.mimeType)
    const blob = new Blob([binaryData], { type: data.mimeType })

    await storage.upload(blob, storagePath)

    try {
      await generateAndUploadThumbnail(binaryData, storagePath)

      const baseValues = {
        storagePath,
        originalFilename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      }

      let image: { id: number; storagePath: string }

      switch (data.entityType) {
        case 'beans': {
          const [result] = await db
            .insert(beanImages)
            .values({ ...baseValues, beanId: data.entityId })
            .returning()
          image = result
          break
        }
        case 'gear': {
          const [result] = await db
            .insert(gearImages)
            .values({ ...baseValues, gearId: data.entityId })
            .returning()
          image = result
          break
        }
        case 'coffee-shops': {
          const [result] = await db
            .insert(coffeeShopImages)
            .values({ ...baseValues, coffeeShopId: data.entityId })
            .returning()
          image = result
          break
        }
        case 'shots': {
          const [result] = await db
            .insert(shotImages)
            .values({ ...baseValues, shotId: data.entityId })
            .returning()
          image = result
          break
        }
        case 'visits': {
          const [result] = await db
            .insert(cafeVisitImages)
            .values({ ...baseValues, cafeVisitId: data.entityId })
            .returning()
          image = result
          break
        }
      }

      return {
        ...image,
        url: storage.getUrl(storagePath),
      }
    } catch (error) {
      await cleanupUncommittedUpload(storagePath)
      throw error
    }
  })

export const setImageAsThumbnail = createServerFn({ method: 'POST' })
  .validator(thumbnailImageIdSchema)
  .handler(async ({ data }) => {
    const table = data.entityType === 'beans' ? beanImages : gearImages
    const foreignKey =
      data.entityType === 'beans' ? beanImages.beanId : gearImages.gearId

    await db.transaction(async (tx) => {
      await tx
        .update(table)
        .set({ isThumbnail: false })
        .where(eq(foreignKey, data.entityId))

      const [image] = await tx
        .update(table)
        .set({ isThumbnail: true })
        .where(and(eq(table.id, data.imageId), eq(foreignKey, data.entityId)))
        .returning({ id: table.id })
      if (!image) throw new Error('Image not found for this entity')
    })
  })

async function deleteImageRecord(
  tx: DatabaseTransaction,
  entityType: EntityType,
  entityId: number,
  imageId: number,
): Promise<{ storagePath: string } | undefined> {
  switch (entityType) {
    case 'beans': {
      const [image] = await tx
        .delete(beanImages)
        .where(and(eq(beanImages.id, imageId), eq(beanImages.beanId, entityId)))
        .returning({ storagePath: beanImages.storagePath })
      return image
    }
    case 'gear': {
      const [image] = await tx
        .delete(gearImages)
        .where(and(eq(gearImages.id, imageId), eq(gearImages.gearId, entityId)))
        .returning({ storagePath: gearImages.storagePath })
      return image
    }
    case 'coffee-shops': {
      const [image] = await tx
        .delete(coffeeShopImages)
        .where(
          and(
            eq(coffeeShopImages.id, imageId),
            eq(coffeeShopImages.coffeeShopId, entityId),
          ),
        )
        .returning({ storagePath: coffeeShopImages.storagePath })
      return image
    }
    case 'shots': {
      const [image] = await tx
        .delete(shotImages)
        .where(and(eq(shotImages.id, imageId), eq(shotImages.shotId, entityId)))
        .returning({ storagePath: shotImages.storagePath })
      return image
    }
    case 'visits': {
      const [image] = await tx
        .delete(cafeVisitImages)
        .where(
          and(
            eq(cafeVisitImages.id, imageId),
            eq(cafeVisitImages.cafeVisitId, entityId),
          ),
        )
        .returning({ storagePath: cafeVisitImages.storagePath })
      return image
    }
  }
}

export const deleteEntityImage = createServerFn({ method: 'POST' })
  .validator(entityImageIdSchema)
  .handler(async ({ data }) => {
    await db.transaction(async (tx) => {
      const image = await deleteImageRecord(
        tx,
        data.entityType,
        data.entityId,
        data.imageId,
      )
      if (!image) throw new Error('Image not found for this entity')
      await queueMediaCleanup(tx, [image.storagePath])
    })

    await drainMediaCleanupQueue()
  })
