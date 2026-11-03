import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { runJournalMutations } from '@/db/journal-mutations.server'
import { parseEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import {
  entityImageSelection,
  setEntityImageThumbnail,
} from '@/lib/server/entity-image-records.server'
import { storeEntityImage } from '@/lib/server/entity-image-store.server'
import { imageStoragePolicy } from '@/lib/server/image-storage.server'
import {
  drainMediaCleanupQueue,
  queueMediaCleanup,
} from '@/lib/server/media-lifecycle.server'
import {
  entityImageIdSchema,
  thumbnailImageIdSchema,
  uploadEntityImageBase64Schema,
} from '@/lib/server-validation'

export type EntityType =
  | 'bean-purchases'
  | 'gear'
  | 'coffee-shops'
  | 'shots'
  | 'visits'
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
  .handler(({ data }) => setEntityImageThumbnail(data))

export const deleteEntityImage = createServerFn({ method: 'POST' })
  .validator(entityImageIdSchema)
  .handler(async ({ data }) => {
    const { table, where } = entityImageSelection(data)
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
