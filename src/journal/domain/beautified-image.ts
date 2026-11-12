import { and, eq, isNull, sql } from 'drizzle-orm'
import { entityImageSelection } from '@/journal/domain/entity-image-records'
import { prepareEntityImageUpload } from '@/journal/domain/entity-image-store'
import {
  imageStorageBytesSql,
  imageStorageMeasuredSql,
  imageStoragePolicy,
} from '@/journal/domain/image-storage'
import {
  cleanupUncommittedUpload,
  drainMediaCleanupQueue,
  queueMediaCleanup,
} from '@/journal/domain/media-lifecycle'
import type { EntityType } from '@/journal/images'
import { journalNow } from '@/journal/platform/clock'
import { db, runJournalMutations } from '@/journal/platform/database'
import { getStorage } from '@/journal/platform/storage'
import { getStoredImagePaths } from '@/lib/image-path'

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

export async function isBeautified(data: ImageSelection) {
  const image = await loadEntityImage(data)
  return { image, beautified: image.beautifiedAt !== null }
}

export async function storeBeautifiedEntityImage(
  data: ImageSelection & { binaryData: Uint8Array; mimeType: string },
) {
  const { image, beautified } = await isBeautified(data)
  if (beautified) throw new Error('This picture is already beautified')
  const { storagePath, prepared } = await prepareEntityImageUpload(data)
  const storage = getStorage()
  const originalBytes =
    image.storageBytes ??
    (
      await Promise.all(
        getStoredImagePaths([image.storagePath]).map((path) =>
          storage.stat(path),
        ),
      )
    ).reduce((total, object) => total + (object?.sizeBytes ?? 0), 0)
  const { table, where } = entityImageSelection(data)
  const policy = imageStoragePolicy()
  const quota =
    policy.limitBytes === null
      ? sql`true`
      : sql`(${imageStorageMeasuredSql()}) and (${imageStorageBytesSql()}) + ${prepared.storageBytes} <= ${policy.limitBytes}`
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
            originalMimeType: image.mimeType,
            originalSizeBytes: image.sizeBytes,
            originalStorageBytes: originalBytes,
            storagePath,
            mimeType: 'image/webp',
            sizeBytes: prepared.sizeBytes,
            storageBytes: originalBytes + prepared.storageBytes,
            beautifiedAt: journalNow(),
          })
          .where(
            and(
              where,
              isNull(table.beautifiedAt),
              eq(table.storagePath, image.storagePath),
              quota,
            ),
          )
          .getSQL(),
        expectedChanges: 1,
        conflictMessage:
          'This picture changed or its storage limit was reached. Reload and try again.',
      },
    ])
  } catch (error) {
    await cleanupUncommittedUpload(storagePath)
    throw error
  }
  return loadEntityImage(data)
}

export async function removeBeautifiedEntityImage(data: ImageSelection) {
  const image = await loadEntityImage(data)
  // An old edited copy may have outlived its original before the migration.
  if (!image.originalStoragePath) {
    if (image.beautifiedAt)
      throw new Error('The original picture is no longer available')
    return image
  }
  const { table, where } = entityImageSelection(data)
  await runJournalMutations([
    {
      statement: db
        .update(table)
        .set({
          storagePath: image.originalStoragePath,
          mimeType: image.originalMimeType,
          sizeBytes: image.originalSizeBytes,
          storageBytes: image.originalStorageBytes,
          originalStoragePath: null,
          originalMimeType: null,
          originalSizeBytes: null,
          originalStorageBytes: null,
          beautifiedAt: null,
        })
        .where(
          and(
            where,
            eq(table.storagePath, image.storagePath),
            eq(table.originalStoragePath, image.originalStoragePath),
          ),
        )
        .getSQL(),
      expectedChanges: 1,
      conflictMessage: 'This picture changed. Reload and try again.',
    },
    ...queueMediaCleanup([image.storagePath]),
  ])
  await drainMediaCleanupQueue()
  return loadEntityImage(data)
}
