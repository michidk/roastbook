import { getOfflineRxDatabase } from '@/modules/rxdb/offline-database'
import {
  DEFAULT_OWNER_KEY,
  isVisibleOperationStatus,
  type OfflineEntityType,
  type OfflineOperation,
} from './operations'

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

function asEntity<T>(value: unknown): LocalEntityRecord<T> {
  const record = value as LocalEntityRecord<T> & { readonly id?: string }
  return {
    ...record,
    key: record.key ?? record.id ?? '',
    revision:
      record.revision ??
      (record as { readonly entityRevision?: string | null }).entityRevision ??
      null,
  }
}

async function allEntities(): Promise<LocalEntityRecord[]> {
  const database = await getOfflineRxDatabase()
  return (await database.entities.find().exec()).map((doc) =>
    asEntity(doc.toJSON()),
  )
}

async function findEntity<T>(
  key: string,
): Promise<LocalEntityRecord<T> | undefined> {
  const database = await getOfflineRxDatabase()
  const doc = await database.entities.findOne(key).exec()
  return doc ? asEntity<T>(doc.toJSON()) : undefined
}

async function pendingOperations(): Promise<OfflineOperation[]> {
  const database = await getOfflineRxDatabase()
  return (await database.operations.find().exec()).map(
    (doc) => doc.toJSON() as OfflineOperation,
  )
}

export async function putLocalEntity<T>(
  input: LocalEntityInput<T> | LocalEntityRecord<T>,
): Promise<LocalEntityRecord<T>> {
  const ownerKey = input.ownerKey ?? DEFAULT_OWNER_KEY
  const record: LocalEntityRecord<T> = {
    key:
      'key' in input
        ? input.key
        : localEntityKey(ownerKey, input.entityType, input.localId),
    ownerKey,
    entityType: input.entityType,
    localId: input.localId,
    serverId: input.serverId ?? null,
    data: input.data,
    revision: input.revision ?? null,
    syncState: input.syncState ?? 'local',
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  }
  const database = await getOfflineRxDatabase()
  const { key: _key, ...document } = record
  const { revision, ...stored } = document
  await database.entities.upsert({
    ...stored,
    entityRevision: revision,
    id: record.key,
  })
  return record
}

export async function getLocalEntity<T>(
  entityType: OfflineEntityType,
  localId: string,
  ownerKey = DEFAULT_OWNER_KEY,
): Promise<LocalEntityRecord<T> | undefined> {
  return findEntity<T>(localEntityKey(ownerKey, entityType, localId))
}

export async function getLocalEntityByServerId<T>(
  entityType: OfflineEntityType,
  serverId: string,
  ownerKey = DEFAULT_OWNER_KEY,
): Promise<LocalEntityRecord<T> | undefined> {
  return (await allEntities()).find(
    (record) =>
      record.ownerKey === ownerKey &&
      record.entityType === entityType &&
      record.serverId === serverId,
  ) as LocalEntityRecord<T> | undefined
}

export async function listLocalEntities<T>(
  options: {
    readonly ownerKey?: string
    readonly entityType?: OfflineEntityType
  } = {},
): Promise<LocalEntityRecord<T>[]> {
  const ownerKey = options.ownerKey ?? DEFAULT_OWNER_KEY
  return (await allEntities())
    .filter(
      (record) =>
        record.ownerKey === ownerKey &&
        (options.entityType === undefined ||
          record.entityType === options.entityType),
    )
    .sort(
      (a, b) =>
        a.entityType.localeCompare(b.entityType) ||
        a.localId.localeCompare(b.localId),
    ) as LocalEntityRecord<T>[]
}

function hasPendingEntityOperations(
  operations: readonly OfflineOperation[],
  entity: LocalEntityRecord,
  entityType: OfflineEntityType,
  serverId: string,
): boolean {
  return operations.some((operation) => {
    if (
      operation.ownerKey !== entity.ownerKey ||
      !isVisibleOperationStatus(operation.status)
    )
      return false
    if (
      operation.entityType === entityType &&
      operation.entityServerId === serverId &&
      (operation.operationType === 'update' ||
        operation.operationType === 'delete')
    )
      return true
    if (
      entityType !== 'brew' ||
      operation.entityType !== 'brew-image' ||
      (operation.operationType !== 'upload' &&
        operation.operationType !== 'remove-image')
    )
      return false
    const payload = operation.payload as {
      readonly entityType?: string
      readonly entityId?: number
    } | null
    return (
      payload?.entityType === 'shots' &&
      String(payload.entityId ?? operation.entityServerId) === serverId
    )
  })
}

export async function putServerEntity<T>(input: {
  readonly ownerKey?: string
  readonly entityType: OfflineEntityType
  readonly serverId: string
  readonly data: T
}): Promise<void> {
  const ownerKey = input.ownerKey ?? DEFAULT_OWNER_KEY
  const existing = await getLocalEntityByServerId<T>(
    input.entityType,
    input.serverId,
    ownerKey,
  )
  const operations = await pendingOperations()
  if (
    operations.some(
      (operation) =>
        operation.ownerKey === ownerKey &&
        operation.entityType === input.entityType &&
        operation.operationType === 'delete' &&
        operation.entityServerId === input.serverId &&
        isVisibleOperationStatus(operation.status),
    )
  )
    return
  if (existing?.syncState === 'pending' || existing?.syncState === 'conflict')
    return
  await putLocalEntity({
    ...(existing ?? { localId: input.serverId }),
    ownerKey,
    entityType: input.entityType,
    serverId: input.serverId,
    data: input.data,
    syncState: 'synced',
  })
}

export async function removeServerEntityImage(
  entityType: OfflineEntityType,
  serverId: string,
  imageId: number,
): Promise<void> {
  const record = await getLocalEntityByServerId<Record<string, unknown>>(
    entityType,
    serverId,
  )
  if (!record) return
  const entityKey = entityType === 'brew' ? 'shot' : 'recipe'
  const entity = record.data[entityKey] as
    | { readonly images?: Array<{ readonly id: number }> }
    | undefined
  if (!entity?.images) return
  await putLocalEntity({
    ...record,
    data: {
      ...record.data,
      [entityKey]: {
        ...entity,
        images: entity.images.filter((image) => image.id !== imageId),
      },
    },
    syncState: 'pending',
    updatedAt: new Date().toISOString(),
  })
}

export async function updateServerEntityRevision(
  entityType: OfflineEntityType,
  serverId: string,
  revision: string,
): Promise<void> {
  const entity = await getLocalEntityByServerId<Record<string, unknown>>(
    entityType,
    serverId,
  )
  if (!entity) return
  const key = entityType === 'brew' ? 'shot' : 'recipe'
  const data = entity.data[key]
  if (!data || typeof data !== 'object') return
  const pending = hasPendingEntityOperations(
    await pendingOperations(),
    entity,
    entityType,
    serverId,
  )
  await putLocalEntity({
    ...entity,
    data: { ...entity.data, [key]: { ...data, revision: Number(revision) } },
    syncState: pending ? 'pending' : 'synced',
    updatedAt: new Date().toISOString(),
  })
}

export async function refreshServerEntitySyncState(
  entityType: OfflineEntityType,
  serverId: string,
): Promise<void> {
  const entity = await getLocalEntityByServerId(entityType, serverId)
  if (!entity) return
  await putLocalEntity({
    ...entity,
    syncState: hasPendingEntityOperations(
      await pendingOperations(),
      entity,
      entityType,
      serverId,
    )
      ? 'pending'
      : 'synced',
    updatedAt: new Date().toISOString(),
  })
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
  const existing = await getLocalEntity(entityType, localId, options.ownerKey)
  if (!existing) return undefined
  return putLocalEntity({
    ...existing,
    serverId: options.serverId,
    revision: options.revision ?? existing.revision,
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  })
}

export async function removeLocalEntity(
  entityType: OfflineEntityType,
  localId: string,
  ownerKey = DEFAULT_OWNER_KEY,
): Promise<void> {
  const database = await getOfflineRxDatabase()
  await database.entities
    .findOne(localEntityKey(ownerKey, entityType, localId))
    .remove()
}

export async function readOfflineSyncMetadata(
  ownerKey = DEFAULT_OWNER_KEY,
): Promise<OfflineSyncMetadata> {
  const database = await getOfflineRxDatabase()
  const doc = await database.entities.findOne(syncMetadataKey(ownerKey)).exec()
  return (
    (doc?.toJSON().data as OfflineSyncMetadata | undefined) ?? {
      ownerKey,
      schemaVersion: OFFLINE_SCHEMA_VERSION,
      lastSuccessfulSyncAt: null,
    }
  )
}

export async function recordSuccessfulSync(
  ownerKey = DEFAULT_OWNER_KEY,
  at = new Date().toISOString(),
): Promise<OfflineSyncMetadata> {
  const metadata = {
    ownerKey,
    schemaVersion: OFFLINE_SCHEMA_VERSION,
    lastSuccessfulSyncAt: at,
  }
  const database = await getOfflineRxDatabase()
  await database.entities.upsert({
    id: syncMetadataKey(ownerKey),
    ownerKey,
    entityType: 'settings',
    localId: syncMetadataKey(ownerKey),
    serverId: null,
    data: metadata,
    entityRevision: null,
    syncState: 'synced',
    updatedAt: at,
  })
  return metadata
}
