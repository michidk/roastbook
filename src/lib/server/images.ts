import { createServerFn } from '@tanstack/react-start'
import { and, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { runJournalMutations } from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import {
  beanImages,
  beanPurchases,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  shotImages,
} from '@/db/schema'
import { expectReturnedRow } from '@/lib/domain-errors'
import { parseEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import {
  cleanupUncommittedUpload,
  drainMediaCleanupQueue,
  queueMediaCleanup,
} from '@/lib/server/media-lifecycle.server'
import { generateAndUploadThumbnail } from '@/lib/server/thumbnails.server'
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
import { createStoredImage, validateImageBuffer } from '@/lib/thumbnail-image'

export type EntityType =
  | 'bean-purchases'
  | 'gear'
  | 'coffee-shops'
  | 'shots'
  | 'visits'
const MAX_IMAGES_PER_ENTITY = 20

const uploadEntityImageBase64Schema = z.object({
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
  idempotent: z.boolean().optional(),
})

const thumbnailImageIdSchema = entityImageIdSchema.extend({
  entityType: thumbnailEntityTypeSchema,
})

const storagePathTypeMap: Record<
  EntityType,
  'beans' | 'gear' | 'coffee-shops' | 'shots' | 'cafe-visits'
> = {
  'bean-purchases': 'beans',
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
    case 'bean-purchases':
      return getBeanPurchaseImageCount(entityId)
    case 'gear':
      return getGearImageCount(entityId)
    case 'coffee-shops':
      return getCoffeeShopImageCount(entityId)
    case 'shots':
      return getShotImageCount(entityId)
    case 'visits':
      return getVisitImageCount(entityId)
  }
}

async function getBeanPurchaseImageCount(entityId: number): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(beanImages)
    .where(owned(beanImages, eq(beanImages.beanPurchaseId, entityId)))
  return result?.value ?? 0
}

async function getGearImageCount(entityId: number): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(gearImages)
    .where(owned(gearImages, eq(gearImages.gearId, entityId)))
  return result?.value ?? 0
}

async function getCoffeeShopImageCount(entityId: number): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(coffeeShopImages)
    .where(owned(coffeeShopImages, eq(coffeeShopImages.coffeeShopId, entityId)))
  return result?.value ?? 0
}

async function getShotImageCount(entityId: number): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(shotImages)
    .where(owned(shotImages, eq(shotImages.shotId, entityId)))
  return result?.value ?? 0
}

async function getVisitImageCount(entityId: number): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(cafeVisitImages)
    .where(owned(cafeVisitImages, eq(cafeVisitImages.cafeVisitId, entityId)))
  return result?.value ?? 0
}

type EntityImageData = {
  entityType: EntityType
  entityId: number
  clientOperationId?: string
  filename: string
  mimeType: string
  binaryData: Buffer
}

async function storeEntityImage(data: EntityImageData) {
  const storage = getStorage()

  if (data.entityType === 'shots' && data.clientOperationId) {
    const existing = await db.query.shotImages.findFirst({
      where: owned(
        shotImages,
        and(
          eq(shotImages.clientOperationId, data.clientOperationId),
          eq(shotImages.shotId, data.entityId),
        ),
      ),
    })
    if (existing) {
      return {
        ...existing,
        url: storage.getUrl(existing.storagePath),
      }
    }
    const usedElsewhere = await db.query.shotImages.findFirst({
      columns: { id: true },
      where: owned(
        shotImages,
        eq(shotImages.clientOperationId, data.clientOperationId),
      ),
    })
    if (usedElsewhere) {
      throw new Error('Image operation id is already used for another brew')
    }
  }

  if (
    (await getEntityImageCount(data.entityType, data.entityId)) >=
    MAX_IMAGES_PER_ENTITY
  ) {
    throw new Error(
      `An entity can have at most ${MAX_IMAGES_PER_ENTITY} images`,
    )
  }

  const storagePathType = storagePathTypeMap[data.entityType]
  const storagePath = generateStoragePath(
    storagePathType,
    data.entityId,
    'image.webp',
  )

  await validateImageBuffer(data.binaryData, data.mimeType)
  const storedImage = await createStoredImage(data.binaryData)
  const blob = new Blob([new Uint8Array(storedImage)], {
    type: 'image/webp',
  })

  await storage.upload(blob, storagePath)

  try {
    await generateAndUploadThumbnail(storedImage, storagePath)

    const baseValues = {
      storagePath,
      originalFilename: data.filename,
      mimeType: 'image/webp',
      sizeBytes: storedImage.byteLength,
    }

    let image: { id: number; storagePath: string }

    switch (data.entityType) {
      case 'bean-purchases': {
        const purchase = await db.query.beanPurchases.findFirst({
          where: owned(beanPurchases, eq(beanPurchases.id, data.entityId)),
          columns: { beanId: true },
        })
        if (!purchase) throw new Error('Bag not found')
        const [result] = await db
          .insert(beanImages)
          .values(
            journalInsertValues({
              ...baseValues,
              beanId: purchase.beanId,
              beanPurchaseId: data.entityId,
            }),
          )
          .returning()
        image = expectReturnedRow(result, 'Image')
        break
      }
      case 'gear': {
        const [result] = await db
          .insert(gearImages)
          .values(journalInsertValues({ ...baseValues, gearId: data.entityId }))
          .returning()
        image = expectReturnedRow(result, 'Image')
        break
      }
      case 'coffee-shops': {
        const [result] = await db
          .insert(coffeeShopImages)
          .values(
            journalInsertValues({ ...baseValues, coffeeShopId: data.entityId }),
          )
          .returning()
        image = expectReturnedRow(result, 'Image')
        break
      }
      case 'shots': {
        const [result] = await db
          .insert(shotImages)
          .values(
            journalInsertValues({
              ...baseValues,
              shotId: data.entityId,
              clientOperationId: data.clientOperationId ?? null,
            }),
          )
          .onConflictDoNothing({
            target: [shotImages.ownerId, shotImages.clientOperationId],
          })
          .returning()
        if (!result) {
          const existing = data.clientOperationId
            ? await db.query.shotImages.findFirst({
                where: owned(
                  shotImages,
                  and(
                    eq(shotImages.clientOperationId, data.clientOperationId),
                    eq(shotImages.shotId, data.entityId),
                  ),
                ),
              })
            : undefined
          if (!existing) throw new Error('Could not save this picture')
          await cleanupUncommittedUpload(storagePath)
          return {
            ...existing,
            url: storage.getUrl(existing.storagePath),
          }
        }
        image = expectReturnedRow(result, 'Image')
        break
      }
      case 'visits': {
        const [result] = await db
          .insert(cafeVisitImages)
          .values(
            journalInsertValues({ ...baseValues, cafeVisitId: data.entityId }),
          )
          .returning()
        image = expectReturnedRow(result, 'Image')
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
}

export const uploadEntityImage = createServerFn({ method: 'POST' })
  .validator(parseEntityImageUploadFormData)
  .handler(async ({ data }) => {
    return storeEntityImage({
      ...data,
      binaryData: Buffer.from(await data.file.arrayBuffer()),
    })
  })

export const uploadEntityImageBase64 = createServerFn({ method: 'POST' })
  .validator(uploadEntityImageBase64Schema)
  .handler(async ({ data }) => {
    const binaryData = Buffer.from(data.fileBase64, 'base64')
    if (binaryData.byteLength !== data.sizeBytes) {
      throw new Error('Image size does not match the uploaded data')
    }

    return storeEntityImage({ ...data, binaryData })
  })

export const setImageAsThumbnail = createServerFn({ method: 'POST' })
  .validator(thumbnailImageIdSchema)
  .handler(async ({ data }) => {
    const table = data.entityType === 'bean-purchases' ? beanImages : gearImages
    const foreignKey =
      data.entityType === 'bean-purchases'
        ? beanImages.beanPurchaseId
        : gearImages.gearId

    await runJournalMutations([
      {
        statement: db
          .update(table)
          .set({ isThumbnail: false })
          .where(owned(table, eq(foreignKey, data.entityId)))
          .getSQL(),
      },
      {
        statement: db
          .update(table)
          .set({ isThumbnail: true })
          .where(
            owned(
              table,
              and(eq(table.id, data.imageId), eq(foreignKey, data.entityId)),
            ),
          )
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Image not found',
      },
    ])
  })

function entityImage(entityType: EntityType) {
  switch (entityType) {
    case 'bean-purchases':
      return { table: beanImages, foreignKey: beanImages.beanPurchaseId }
    case 'gear':
      return { table: gearImages, foreignKey: gearImages.gearId }
    case 'coffee-shops':
      return {
        table: coffeeShopImages,
        foreignKey: coffeeShopImages.coffeeShopId,
      }
    case 'shots':
      return { table: shotImages, foreignKey: shotImages.shotId }
    case 'visits':
      return { table: cafeVisitImages, foreignKey: cafeVisitImages.cafeVisitId }
  }
}

export const deleteEntityImage = createServerFn({ method: 'POST' })
  .validator(entityImageIdSchema)
  .handler(async ({ data }) => {
    const { table, foreignKey } = entityImage(data.entityType)
    const where = owned(
      table,
      and(eq(table.id, data.imageId), eq(foreignKey, data.entityId)),
    )
    const [image] = await db
      .select({ storagePath: table.storagePath })
      .from(table)
      .where(where)
      .limit(1)
    if (!image) {
      if (data.idempotent) return
      throw new Error('Image not found')
    }
    await runJournalMutations([
      {
        statement: db.delete(table).where(where).getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Image changed. Reload and try again.',
      },
      ...queueMediaCleanup([image.storagePath]),
    ])
    await drainMediaCleanupQueue()
  })
