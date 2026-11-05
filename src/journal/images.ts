import {
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
import { parseEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import {
  entityImageIdSchema,
  thumbnailImageIdSchema,
} from '@/lib/server-validation'

export type EntityType =
  | 'beans'
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

export const getImageUploadPolicy = journalRead(
  'images/getImageUploadPolicy',
).handler(() => imageStoragePolicy())
