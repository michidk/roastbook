import { IMAGE_MIME_TYPE_VALUES, MAX_IMAGE_BYTES } from '@/lib/domain-contracts'
import {
  DEFAULT_OWNER_KEY,
  type OfflineEntityType,
} from '@/modules/offline/operations'
import { getOfflineRxDatabase } from '@/modules/rxdb/offline-database'

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

function toBlobRecord(value: {
  readonly id: string
  readonly ownerKey: string
  readonly entityType: string
  readonly entityId: string
  readonly filename: string
  readonly mimeType: string
  readonly sizeBytes: number
  readonly createdAt: string
  readonly data: string
}): OfflineBlobRecord {
  const bytes = Uint8Array.from(atob(value.data), (char) => char.charCodeAt(0))
  return {
    key: value.id,
    ownerKey: value.ownerKey,
    entityType: value.entityType as OfflineEntityType,
    entityId: value.entityId,
    filename: value.filename,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    createdAt: value.createdAt,
    blob: new Blob([bytes], { type: value.mimeType }),
  }
}

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

  const bytes = new Uint8Array(await input.file.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const database = await getOfflineRxDatabase()
  const { key: id, blob: _blob, ...stored } = record
  await database.blobs.insert({ ...stored, id, data: btoa(binary) })
  return record
}

export async function getOfflineBlob(
  key: string,
): Promise<OfflineBlobRecord | undefined> {
  const database = await getOfflineRxDatabase()
  const doc = await database.blobs.findOne(key).exec()
  if (!doc) return undefined
  return toBlobRecord(doc.toJSON())
}

export async function listOfflineBlobs(
  options: {
    readonly ownerKey?: string
    readonly entityType?: OfflineEntityType
    readonly entityId?: string | number
  } = {},
): Promise<OfflineBlobRecord[]> {
  const ownerKey = options.ownerKey ?? DEFAULT_OWNER_KEY
  const database = await getOfflineRxDatabase()
  const records = (await database.blobs.find().exec()).map((doc) =>
    doc.toJSON(),
  )

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
    .map((value) => toBlobRecord(value))
}

export async function deleteOfflineBlob(key: string): Promise<void> {
  const database = await getOfflineRxDatabase()
  await database.blobs.findOne(key).remove()
}

export async function deleteOfflineBlobsForEntity(
  entityType: OfflineEntityType,
  entityId: string | number,
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<void> {
  const records = await listOfflineBlobs({ ownerKey, entityType, entityId })
  await Promise.all(records.map((record) => deleteOfflineBlob(record.key)))
}
