import { and, eq, isNull, sql } from 'drizzle-orm'
import {
  entityImageSelection,
  entityImageTarget,
} from '@/journal/domain/entity-image-records'
import {
  imageStorageBytesSql,
  imageStorageMeasuredSql,
  imageStoragePolicy,
  measureLegacyImageStorage,
} from '@/journal/domain/image-storage'
import { cleanupUncommittedUpload } from '@/journal/domain/media-lifecycle'
import { prepareStoredImage } from '@/journal/domain/stored-image'
import type { EntityType } from '@/journal/images'
import { db, runJournalMutations } from '@/journal/platform/database'
import { generateStoragePath, getStorage } from '@/journal/platform/storage'

type ImageSelection = {
  entityType: EntityType
  entityId: number
  imageId: number
}

export async function loadEntityImage(data: ImageSelection) {
  const { table, where } = entityImageSelection(data)
  const [image] = await db.select().from(table).where(where).limit(1)
  if (!image) throw new Error('Image not found')
  return image
}

export async function replaceWithBeautifiedImage(
  data: ImageSelection & {
    expectedStoragePath: string
    binaryData: Uint8Array
    mimeType: string
  },
) {
  const image = await loadEntityImage(data)
  if (image.originalStoragePath)
    throw new Error('This picture is already beautified')
  if (image.storagePath !== data.expectedStoragePath)
    throw new Error('Picture changed. Reload and try again.')
  await measureLegacyImageStorage(100)
  const { table, where } = entityImageSelection(data)
  const { storageType } = entityImageTarget(data.entityType)
  const storagePath = generateStoragePath(
    storageType,
    data.entityId,
    'image.webp',
  )
  const prepared = await prepareStoredImage(
    data.binaryData,
    data.mimeType,
    storagePath,
  )
  const { limitBytes } = imageStoragePolicy()
  const quota =
    limitBytes === null
      ? sql`true`
      : sql`(${imageStorageMeasuredSql()}) and (${imageStorageBytesSql()}) + ${prepared.storageBytes} <= ${limitBytes}`
  const storage = getStorage()
  try {
    for (const file of prepared.files)
      await storage.upload(
        new Blob([new Uint8Array(file.buffer)], { type: 'image/webp' }),
        file.path,
      )
    await runJournalMutations([
      {
        statement: db
          .update(table)
          .set({
            originalStoragePath: image.storagePath,
            storagePath,
            mimeType: 'image/webp',
            sizeBytes: prepared.sizeBytes,
            storageBytes: sql`${table.storageBytes} + ${prepared.storageBytes}`,
          })
          .where(
            and(
              where,
              eq(table.storagePath, data.expectedStoragePath),
              isNull(table.originalStoragePath),
              sql`${table.storageBytes} is not null`,
              quota,
            ),
          )
          .getSQL(),
        expectedChanges: 1,
        conflictMessage:
          'Picture changed or storage allowance is full. The original is safe.',
      },
    ])
  } catch (error) {
    await cleanupUncommittedUpload(storagePath)
    throw error
  }
  return loadEntityImage(data)
}
