import { IMAGE_MIME_TYPE_VALUES, MAX_IMAGE_BYTES } from '@/lib/domain-contracts'
import {
  DEFAULT_OWNER_KEY,
  type OfflineEntityType,
} from '@/modules/offline/operations'
import {
  OFFLINE_BLOBS_STORE,
  openOfflineDatabase,
  requestToPromise,
  transactionToPromise,
} from '@/modules/offline/storage'

export interface OfflineBlobRecord {
  readonly key: string
  readonly ownerKey: string
  readonly entityType: OfflineEntityType
  readonly entityId: string
  readonly filename: string
  readonly mimeType: string
  readonly sizeBytes: number
  readonly createdAt: string
  readonly blob: Blob
}

export interface PutOfflineBlobInput {
  readonly ownerKey?: string
  readonly entityType: OfflineEntityType
  readonly entityId: string | number
  readonly file: File
}

const ALLOWED_IMAGE_TYPES = new Set<string>(IMAGE_MIME_TYPE_VALUES)

export async function putOfflineBlob(
  input: PutOfflineBlobInput,
): Promise<OfflineBlobRecord> {
  if (input.file.size <= 0) {
    throw new Error('Choose a non-empty image file')
  }
  if (input.file.size > MAX_IMAGE_BYTES) {
    throw new Error('This image is too large to save offline')
  }
  if (!ALLOWED_IMAGE_TYPES.has(input.file.type)) {
    throw new Error('This image type cannot be saved offline')
  }

  const record: OfflineBlobRecord = {
    key: crypto.randomUUID(),
    ownerKey: input.ownerKey ?? DEFAULT_OWNER_KEY,
    entityType: input.entityType,
    entityId: String(input.entityId),
    filename: input.file.name,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    createdAt: new Date().toISOString(),
    blob: input.file,
  }

  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_BLOBS_STORE, 'readwrite')
  transaction.objectStore(OFFLINE_BLOBS_STORE).put(record)
  await transactionToPromise(transaction)
  return record
}

export async function getOfflineBlob(
  key: string,
): Promise<OfflineBlobRecord | undefined> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_BLOBS_STORE, 'readonly')
  const record = (await requestToPromise(
    transaction.objectStore(OFFLINE_BLOBS_STORE).get(key),
  )) as OfflineBlobRecord | undefined
  await transactionToPromise(transaction)
  return record
}

export async function listOfflineBlobs(
  options: {
    readonly ownerKey?: string
    readonly entityType?: OfflineEntityType
    readonly entityId?: string | number
  } = {},
): Promise<OfflineBlobRecord[]> {
  const ownerKey = options.ownerKey ?? DEFAULT_OWNER_KEY
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_BLOBS_STORE, 'readonly')
  const records = (await requestToPromise(
    transaction.objectStore(OFFLINE_BLOBS_STORE).getAll(),
  )) as OfflineBlobRecord[]
  await transactionToPromise(transaction)

  return records
    .filter(
      (record) =>
        record.ownerKey === ownerKey &&
        (options.entityType === undefined ||
          record.entityType === options.entityType) &&
        (options.entityId === undefined ||
          record.entityId === String(options.entityId)),
    )
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export async function deleteOfflineBlob(key: string): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_BLOBS_STORE, 'readwrite')
  transaction.objectStore(OFFLINE_BLOBS_STORE).delete(key)
  await transactionToPromise(transaction)
}

export async function deleteOfflineBlobsForEntity(
  entityType: OfflineEntityType,
  entityId: string | number,
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<void> {
  const records = await listOfflineBlobs({ ownerKey, entityType, entityId })
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_BLOBS_STORE, 'readwrite')
  const store = transaction.objectStore(OFFLINE_BLOBS_STORE)
  for (const record of records) store.delete(record.key)
  await transactionToPromise(transaction)
}
