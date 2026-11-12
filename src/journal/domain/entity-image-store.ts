import { and, eq, sql } from 'drizzle-orm'
import { beanPurchases } from '@/db/schema'
import {
  ensureEntityImageThumbnail,
  entityImageTarget,
  requireEntityImageCapacity,
} from '@/journal/domain/entity-image-records'
import {
  imageStorageBytesSql,
  imageStorageMeasuredSql,
  imageStoragePolicy,
  loadImageStorageUsage,
  measureLegacyImageStorage,
} from '@/journal/domain/image-storage'
import { cleanupUncommittedUpload } from '@/journal/domain/media-lifecycle'
import {
  type PreparedSizes,
  prepareStoredImage,
} from '@/journal/domain/stored-image'
import type { EntityType } from '@/journal/images'
import { journalNow } from '@/journal/platform/clock'
import {
  allocateJournalIds,
  db,
  journalOwnerId,
  owned,
  runJournalMutations,
} from '@/journal/platform/database'
import { generateStoragePath, getStorage } from '@/journal/platform/storage'

type EntityImageData = {
  entityType: EntityType
  entityId: number
  filename: string
  mimeType: string
  binaryData: Uint8Array
  /** Thumbnails the browser encoded with the stored picture. */
  sizes?: PreparedSizes
}

export async function storeEntityImage(data: EntityImageData) {
  await requireEntityImageCapacity(
    data.entityType,
    data.entityId,
    imageStoragePolicy().maxImagesPerItem,
  )
  const upload = await prepareEntityImageUpload(data)
  return commitEntityImage({ ...data, ...upload })
}

export async function prepareEntityImageUpload(
  data: Omit<EntityImageData, 'filename'>,
) {
  const { storageType } = entityImageTarget(data.entityType)
  const policy = imageStoragePolicy()
  await measureLegacyImageStorage()
  const usage = await loadImageStorageUsage()
  if (policy.limitBytes !== null && usage.unmeasuredImages)
    throw new Error(
      'Image storage is being measured. Refresh Settings > Storage, then try again.',
    )
  if (policy.limitBytes !== null && usage.totalBytes >= policy.limitBytes)
    throw new Error(
      'Your image storage allowance is full. Remove pictures to free up space.',
    )

  const storagePath = generateStoragePath(
    storageType,
    data.entityId,
    'image.webp',
  )
  const prepared = await prepareStoredImage(
    data.binaryData,
    data.mimeType,
    storagePath,
    data.sizes,
  )
  if (
    policy.limitBytes !== null &&
    usage.totalBytes + prepared.storageBytes > policy.limitBytes
  )
    throw new Error(
      'This compressed picture would exceed your image storage allowance. Remove pictures to free up space.',
    )
  return { storagePath, prepared }
}

export async function commitEntityImage(
  data: Omit<EntityImageData, 'binaryData' | 'mimeType'> & {
    storagePath: string
    prepared: Awaited<ReturnType<typeof prepareStoredImage>>
  },
) {
  const storage = getStorage()
  const { table, foreignKey, parent } = entityImageTarget(data.entityType)
  const policy = imageStoragePolicy()
  const { storagePath, prepared } = data
  const [id] = await allocateJournalIds(table)
  if (!id) throw new Error('Could not allocate a picture identifier')
  const quota =
    policy.limitBytes === null
      ? sql`true`
      : sql`(${imageStorageMeasuredSql()}) and (${imageStorageBytesSql()}) + ${prepared.storageBytes} <= ${policy.limitBytes}`
  const capacity = sql`and (select count(*) from ${table} where ${owned(table, eq(foreignKey, data.entityId))}) < ${policy.maxImagesPerItem}`
  const beanColumn =
    data.entityType === 'bean-purchases' ? sql`, bean_id` : sql``
  const beanValue =
    data.entityType === 'bean-purchases'
      ? sql`, (select ${beanPurchases.beanId} from ${beanPurchases} where ${owned(beanPurchases, eq(beanPurchases.id, data.entityId))})`
      : sql``

  try {
    for (const file of prepared.files)
      await storage.upload(
        new Blob([new Uint8Array(file.buffer)], { type: 'image/webp' }),
        file.path,
      )
    await runJournalMutations([
      {
        statement: sql`insert into ${table} (id, owner_id, created_at, storage_path, original_filename, mime_type, size_bytes, storage_bytes, ${sql.identifier(foreignKey.name)}${beanColumn})
        select ${id}, ${journalOwnerId()}, ${sql.param(journalNow(), table.createdAt)}, ${storagePath}, ${data.filename}, 'image/webp', ${prepared.sizeBytes}, ${prepared.storageBytes}, ${data.entityId}${beanValue}
        where exists(select 1 from ${parent} where ${owned(parent, eq(parent.id, data.entityId))})
          ${capacity}
          and (${quota})`,
        expectedChanges: 1,
        conflictMessage:
          'This item changed or its picture or storage limit was reached. Reload and try again.',
      },
      ...ensureEntityImageThumbnail(data.entityType, data.entityId),
    ])
  } catch (error) {
    await cleanupUncommittedUpload(storagePath)
    throw error
  }
  const [image] = await db
    .select()
    .from(table)
    .where(
      owned(table, and(eq(table.id, id), eq(table.storagePath, storagePath))),
    )
    .limit(1)
  if (!image) throw new Error('Picture was removed while uploading')
  return { ...image, url: storage.getUrl(storagePath) }
}
