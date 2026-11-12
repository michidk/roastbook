import { z } from 'zod'
import {
  removeBeautifiedEntityImage,
  storeBeautifiedEntityImage,
} from '@/journal/domain/beautified-image'
import {
  ensureEntityImageThumbnail,
  entityImageSelection,
  setEntityImageThumbnail,
} from '@/journal/domain/entity-image-records'
import { storeEntityImage } from '@/journal/domain/entity-image-store'
import { imageStoragePolicy } from '@/journal/domain/image-storage'
import {
  drainMediaCleanupQueue,
  queueMediaCleanup,
} from '@/journal/domain/media-lifecycle'
import { journalRead, journalWrite } from '@/journal/function'
import { db, runJournalMutations } from '@/journal/platform/database'
import { decodeBase64 } from '@/lib/base64'
import { parseEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import {
  entityImageIdSchema,
  thumbnailImageIdSchema,
} from '@/lib/server-validation'

export type EntityType =
  | 'bean-purchases'
  | 'gear'
  | 'coffee-shops'
  | 'shots'
  | 'visits'
export const uploadEntityImage = journalWrite('images/uploadEntityImage')
  .validator(parseEntityImageUploadFormData)
  .handler(async ({ data }) => {
    const bytes = async (file: File) => new Uint8Array(await file.arrayBuffer())
    return storeEntityImage({
      ...data,
      binaryData: await bytes(data.file),
      sizes: data.sizes && {
        thumbnail: await bytes(data.sizes.thumbnail),
        small: await bytes(data.sizes.small),
      },
    })
  })

export const setImageAsThumbnail = journalWrite('images/setImageAsThumbnail')
  .validator(thumbnailImageIdSchema)
  .handler(({ data }) => setEntityImageThumbnail(data))

export const deleteEntityImage = journalWrite('images/deleteEntityImage')
  .validator(entityImageIdSchema)
  .handler(async ({ data }) => {
    const { table, where } = entityImageSelection(data)
    const [image] = await db
      .select({
        storagePath: table.storagePath,
        originalStoragePath: table.originalStoragePath,
      })
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
      ...ensureEntityImageThumbnail(data.entityType, data.entityId),
      ...queueMediaCleanup([
        image.storagePath,
        ...(image.originalStoragePath ? [image.originalStoragePath] : []),
      ]),
    ])
    await drainMediaCleanupQueue()
  })

export const getImageUploadPolicy = journalRead(
  'images/getImageUploadPolicy',
).handler(() => imageStoragePolicy())

export const saveBeautifiedImage = journalWrite('images/saveBeautifiedImage')
  .validator(
    entityImageIdSchema.extend({
      imageBase64: z
        .string()
        .min(1)
        .max(16 * 1024 * 1024),
      mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    }),
  )
  .handler(async ({ data: { imageBase64, imageId, ...data } }) => {
    const image = await storeBeautifiedEntityImage({
      ...data,
      imageId,
      binaryData: decodeBase64(imageBase64),
    })
    if (data.entityType === 'bean-purchases' || data.entityType === 'gear')
      await setEntityImageThumbnail({
        entityType: data.entityType,
        entityId: data.entityId,
        imageId: image.id,
      })
    return image
  })

export const deleteBeautifiedImage = journalWrite(
  'images/deleteBeautifiedImage',
)
  .validator(entityImageIdSchema)
  .handler(({ data }) => removeBeautifiedEntityImage(data))
