import '@tanstack/react-start/server-only'
import { and, count, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  allocateJournalIds,
  runJournalMutations,
} from '@/db/journal-mutations.server'
import { journalOwnerId, owned } from '@/db/journal-scope.server'
import {
  beanImages,
  beanPurchases,
  cafeVisitImages,
  cafeVisits,
  coffeeShopImages,
  coffeeShops,
  gear,
  gearImages,
  shotImages,
  shots,
} from '@/db/schema'
import {
  imageStorageBytesSql,
  imageStorageMeasuredSql,
  imageStoragePolicy,
  loadImageStorageUsage,
  measureLegacyImageStorage,
} from '@/lib/server/image-storage.server'
import type { EntityType } from '@/lib/server/images'
import { cleanupUncommittedUpload } from '@/lib/server/media-lifecycle.server'
import { prepareStoredImage } from '@/lib/server/stored-image.server'
import { generateStoragePath, getStorage } from '@/lib/storage'

export function entityImageTarget(entityType: EntityType) {
  switch (entityType) {
    case 'bean-purchases':
      return {
        table: beanImages,
        foreignKey: beanImages.beanPurchaseId,
        parent: beanPurchases,
        storageType: 'beans' as const,
      }
    case 'gear':
      return {
        table: gearImages,
        foreignKey: gearImages.gearId,
        parent: gear,
        storageType: 'gear' as const,
      }
    case 'coffee-shops':
      return {
        table: coffeeShopImages,
        foreignKey: coffeeShopImages.coffeeShopId,
        parent: coffeeShops,
        storageType: 'coffee-shops' as const,
      }
    case 'shots':
      return {
        table: shotImages,
        foreignKey: shotImages.shotId,
        parent: shots,
        storageType: 'shots' as const,
      }
    case 'visits':
      return {
        table: cafeVisitImages,
        foreignKey: cafeVisitImages.cafeVisitId,
        parent: cafeVisits,
        storageType: 'cafe-visits' as const,
      }
  }
}

type EntityImageData = {
  entityType: EntityType
  entityId: number
  clientOperationId?: string
  filename: string
  mimeType: string
  binaryData: Buffer
}

async function existingOperation(
  data: Pick<EntityImageData, 'entityType' | 'entityId' | 'clientOperationId'>,
) {
  if (data.entityType !== 'shots' || !data.clientOperationId) return undefined
  const existing = await db.query.shotImages.findFirst({
    where: owned(
      shotImages,
      eq(shotImages.clientOperationId, data.clientOperationId),
    ),
  })
  if (existing && existing.shotId !== data.entityId)
    throw new Error('Image operation id is already used for another brew')
  return existing
}

export async function storeEntityImage(data: EntityImageData) {
  const storage = getStorage()
  const existing = await existingOperation(data)
  if (existing)
    return { ...existing, url: storage.getUrl(existing.storagePath) }

  const { table, foreignKey, parent, storageType } = entityImageTarget(
    data.entityType,
  )
  const policy = imageStoragePolicy()
  const [record] = await db
    .select({ id: parent.id })
    .from(parent)
    .where(owned(parent, eq(parent.id, data.entityId)))
    .limit(1)
  if (!record) throw new Error('Record not found')
  const [current] = await db
    .select({ images: count() })
    .from(table)
    .where(owned(table, eq(foreignKey, data.entityId)))
  if (Number(current?.images ?? 0) >= policy.maxImagesPerItem)
    throw new Error(
      `Each item can have at most ${policy.maxImagesPerItem} pictures. Remove a picture before adding another.`,
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
  const beanColumn =
    data.entityType === 'bean-purchases' ? sql`, bean_id` : sql``
  const beanValue =
    data.entityType === 'bean-purchases'
      ? sql`, (select ${beanPurchases.beanId} from ${beanPurchases} where ${owned(beanPurchases, eq(beanPurchases.id, data.entityId))})`
      : sql``
  const operationColumn =
    data.entityType === 'shots' ? sql`, client_operation_id` : sql``
  const operationValue =
    data.entityType === 'shots'
      ? sql`, ${data.clientOperationId ?? null}`
      : sql``
  const conflict =
    data.entityType === 'shots'
      ? sql`on conflict(owner_id, client_operation_id) do nothing`
      : sql``

  try {
    for (const file of prepared.files)
      await storage.upload(
        new Blob([new Uint8Array(file.buffer)], { type: 'image/webp' }),
        file.path,
      )
    await runJournalMutations([
      {
        statement: sql`insert into ${table} (id, owner_id, storage_path, original_filename, mime_type, size_bytes, storage_bytes, ${sql.identifier(foreignKey.name)}${beanColumn}${operationColumn})
        select ${id}, ${journalOwnerId()}, ${storagePath}, ${data.filename}, 'image/webp', ${prepared.sizeBytes}, ${prepared.storageBytes}, ${data.entityId}${beanValue}${operationValue}
        where exists(select 1 from ${parent} where ${owned(parent, eq(parent.id, data.entityId))})
          and (select count(*) from ${table} where ${owned(table, eq(foreignKey, data.entityId))}) < ${policy.maxImagesPerItem}
          and (${quota}) ${conflict}`,
        expectedChanges: 1,
        conflictMessage:
          'This item changed or its picture or storage limit was reached. Reload and try again.',
      },
    ])
  } catch (error) {
    await cleanupUncommittedUpload(storagePath)
    const duplicate = await existingOperation(data)
    if (duplicate)
      return { ...duplicate, url: storage.getUrl(duplicate.storagePath) }
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
