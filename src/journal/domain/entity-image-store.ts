import { and, eq, isNull, sql } from 'drizzle-orm'
import { beanPurchases } from '@/db/schema'
import {
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
  /** Marks an AI-retouched copy of another picture of the same item. */
  beautifiedFromImageId?: number
}

export async function storeEntityImage(data: EntityImageData) {
  const { storageType } = entityImageTarget(data.entityType)
  const policy = imageStoragePolicy()
  // Beautified copies do not use up the per-item picture limit.
  if (data.beautifiedFromImageId === undefined)
    await requireEntityImageCapacity(
      data.entityType,
      data.entityId,
      policy.maxImagesPerItem,
    )

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
  return commitEntityImage({ ...data, storagePath, prepared })
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
  const capacity =
    data.beautifiedFromImageId === undefined
      ? sql`and (select count(*) from ${table} where ${owned(table, and(eq(foreignKey, data.entityId), isNull(table.beautifiedFromImageId)))}) < ${policy.maxImagesPerItem}`
      : sql``
  const beautified =
    data.beautifiedFromImageId === undefined
      ? sql``
      : sql`, ${data.beautifiedFromImageId}`
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
        statement: sql`insert into ${table} (id, owner_id, created_at, storage_path, original_filename, mime_type, size_bytes, storage_bytes, ${sql.identifier(foreignKey.name)}${beanColumn}${data.beautifiedFromImageId === undefined ? sql`` : sql`, beautified_from_image_id`})
        select ${id}, ${journalOwnerId()}, ${sql.param(journalNow(), table.createdAt)}, ${storagePath}, ${data.filename}, 'image/webp', ${prepared.sizeBytes}, ${prepared.storageBytes}, ${data.entityId}${beanValue}${beautified}
        where exists(select 1 from ${parent} where ${owned(parent, eq(parent.id, data.entityId))})
          ${capacity}
          and (${quota})`,
        expectedChanges: 1,
        conflictMessage:
          'This item changed or its picture or storage limit was reached. Reload and try again.',
      },
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
