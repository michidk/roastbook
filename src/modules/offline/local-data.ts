import { DEFAULT_OWNER_KEY, type OfflineEntityType } from './operations'
import {
  LOCAL_ENTITIES_STORE,
  OWNER_ENTITY_SERVER_INDEX,
  openOfflineDatabase,
  requestToPromise,
  SYNC_METADATA_STORE,
  transactionToPromise,
} from './storage'

export const OFFLINE_SCHEMA_VERSION = 1
const SYNC_METADATA_KEY_SUFFIX = 'sync'

export type LocalEntitySyncState = 'local' | 'pending' | 'synced' | 'conflict'

export interface LocalEntityRecord<T = unknown> {
  readonly key: string
  readonly ownerKey: string
  readonly entityType: OfflineEntityType
  readonly localId: string
  readonly serverId: string | null
  readonly data: T
  readonly revision: string | null
  readonly syncState: LocalEntitySyncState
  readonly updatedAt: string
  readonly deletedAt: string | null
}

export interface LocalEntityInput<T> {
  readonly ownerKey?: string
  readonly entityType: OfflineEntityType
  readonly localId: string
  readonly serverId?: string | null
  readonly data: T
  readonly revision?: string | null
  readonly syncState?: LocalEntitySyncState
  readonly updatedAt?: string
  readonly deletedAt?: string | null
}

export interface OfflineSyncMetadata {
  readonly ownerKey: string
  readonly schemaVersion: number
  readonly lastSuccessfulSyncAt: string | null
}

function localEntityKey(
  ownerKey: string,
  entityType: OfflineEntityType,
  localId: string,
): string {
  return `${encodeURIComponent(ownerKey)}:${entityType}:${encodeURIComponent(localId)}`
}

function syncMetadataKey(ownerKey: string): string {
  return `${encodeURIComponent(ownerKey)}:${SYNC_METADATA_KEY_SUFFIX}`
}

export async function putLocalEntity<T>(
  input: LocalEntityInput<T>,
): Promise<LocalEntityRecord<T>> {
  const ownerKey = input.ownerKey ?? DEFAULT_OWNER_KEY
  const record: LocalEntityRecord<T> = {
    key: localEntityKey(ownerKey, input.entityType, input.localId),
    ownerKey,
    entityType: input.entityType,
    localId: input.localId,
    serverId: input.serverId ?? null,
    data: input.data,
    revision: input.revision ?? null,
    syncState: input.syncState ?? 'local',
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    deletedAt: input.deletedAt ?? null,
  }

  const database = await openOfflineDatabase()
  const transaction = database.transaction(LOCAL_ENTITIES_STORE, 'readwrite')
  transaction.objectStore(LOCAL_ENTITIES_STORE).put(record)
  await transactionToPromise(transaction)
  return record
}

export async function getLocalEntity<T>(
  entityType: OfflineEntityType,
  localId: string,
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<LocalEntityRecord<T> | undefined> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(LOCAL_ENTITIES_STORE, 'readonly')
  const record = (await requestToPromise(
    transaction
      .objectStore(LOCAL_ENTITIES_STORE)
      .get(localEntityKey(ownerKey, entityType, localId)),
  )) as LocalEntityRecord<T> | undefined
  await transactionToPromise(transaction)
  return record
}

export async function getLocalEntityByServerId<T>(
  entityType: OfflineEntityType,
  serverId: string,
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<LocalEntityRecord<T> | undefined> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(LOCAL_ENTITIES_STORE, 'readonly')
  const record = (await requestToPromise(
    transaction
      .objectStore(LOCAL_ENTITIES_STORE)
      .index(OWNER_ENTITY_SERVER_INDEX)
      .get([ownerKey, entityType, serverId]),
  )) as LocalEntityRecord<T> | undefined
  await transactionToPromise(transaction)
  return record
}

export async function listLocalEntities<T>(
  options: {
    readonly ownerKey?: string
    readonly entityType?: OfflineEntityType
    readonly includeDeleted?: boolean
  } = {},
): Promise<LocalEntityRecord<T>[]> {
  const ownerKey = options.ownerKey ?? DEFAULT_OWNER_KEY
  const database = await openOfflineDatabase()
  const transaction = database.transaction(LOCAL_ENTITIES_STORE, 'readonly')
  const records = (await requestToPromise(
    transaction.objectStore(LOCAL_ENTITIES_STORE).getAll(),
  )) as LocalEntityRecord<T>[]
  await transactionToPromise(transaction)

  return records
    .filter(
      (record) =>
        record.ownerKey === ownerKey &&
        (options.entityType === undefined ||
          record.entityType === options.entityType) &&
        (options.includeDeleted === true || record.deletedAt === null),
    )
    .sort(
      (left, right) =>
        left.entityType.localeCompare(right.entityType) ||
        left.localId.localeCompare(right.localId),
    )
}

export async function markLocalEntitySynced(
  entityType: OfflineEntityType,
  localId: string,
  options: {
    readonly ownerKey?: string
    readonly serverId: string
    readonly revision?: string | null
  },
): Promise<LocalEntityRecord | undefined> {
  const ownerKey = options.ownerKey ?? DEFAULT_OWNER_KEY
  const existing = await getLocalEntity(entityType, localId, ownerKey)
  if (!existing) return undefined

  return putLocalEntity({
    ...existing,
    ownerKey,
    serverId: options.serverId,
    revision: options.revision ?? existing.revision,
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  })
}

export async function tombstoneLocalEntity(
  entityType: OfflineEntityType,
  localId: string,
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<LocalEntityRecord | undefined> {
  const existing = await getLocalEntity(entityType, localId, ownerKey)
  if (!existing) return undefined

  return putLocalEntity({
    ...existing,
    ownerKey,
    syncState: 'pending',
    deletedAt: existing.deletedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function removeLocalEntity(
  entityType: OfflineEntityType,
  localId: string,
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(LOCAL_ENTITIES_STORE, 'readwrite')
  transaction
    .objectStore(LOCAL_ENTITIES_STORE)
    .delete(localEntityKey(ownerKey, entityType, localId))
  await transactionToPromise(transaction)
}

export async function readOfflineSyncMetadata(
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<OfflineSyncMetadata> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(SYNC_METADATA_STORE, 'readonly')
  const record = (await requestToPromise(
    transaction.objectStore(SYNC_METADATA_STORE).get(syncMetadataKey(ownerKey)),
  )) as OfflineSyncMetadata | undefined
  await transactionToPromise(transaction)

  return (
    record ?? {
      ownerKey,
      schemaVersion: OFFLINE_SCHEMA_VERSION,
      lastSuccessfulSyncAt: null,
    }
  )
}

export async function recordSuccessfulSync(
  ownerKey: string = DEFAULT_OWNER_KEY,
  at: string = new Date().toISOString(),
): Promise<OfflineSyncMetadata> {
  const metadata: OfflineSyncMetadata = {
    ownerKey,
    schemaVersion: OFFLINE_SCHEMA_VERSION,
    lastSuccessfulSyncAt: at,
  }
  const database = await openOfflineDatabase()
  const transaction = database.transaction(SYNC_METADATA_STORE, 'readwrite')
  transaction
    .objectStore(SYNC_METADATA_STORE)
    .put(metadata, syncMetadataKey(ownerKey))
  await transactionToPromise(transaction)
  return metadata
}
