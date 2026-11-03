import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { runJournalMutations } from '@/db/journal-mutations.server'
import { owned } from '@/db/journal-scope.server'
import { beanImages, gearImages } from '@/db/schema'
import { parseEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import {
  entityImageTarget,
  storeEntityImage,
} from '@/lib/server/entity-image-store.server'
import { imageStoragePolicy } from '@/lib/server/image-storage.server'
import {
  drainMediaCleanupQueue,
  queueMediaCleanup,
} from '@/lib/server/media-lifecycle.server'
import {
  entityTypeSchema,
  imageBase64Schema,
  imageFilenameSchema,
  imageMimeTypeSchema,
  MAX_IMAGE_BYTES,
  positiveIdSchema,
  thumbnailEntityTypeSchema,
} from '@/lib/server-validation'

export type EntityType =
  | 'bean-purchases'
  | 'gear'
  | 'coffee-shops'
  | 'shots'
  | 'visits'
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

export const deleteEntityImage = createServerFn({ method: 'POST' })
  .validator(entityImageIdSchema)
  .handler(async ({ data }) => {
    const { table, foreignKey } = entityImageTarget(data.entityType)
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

export const getImageUploadPolicy = createServerFn({ method: 'GET' }).handler(
  () => imageStoragePolicy(),
)
