import { getOfflineRxDatabase } from '@/modules/rxdb/offline-database'
import { deleteOfflineBlob } from './blob-store'
import { getLocalEntityByServerId, removeLocalEntity } from './local-data'
import {
  canTransitionOperationStatus,
  DEFAULT_OWNER_KEY,
  isTerminalOperationStatus,
  type OfflineEntityType,
  type OfflineOperation,
  type OfflineOperationStatus,
  type OfflineOperationType,
} from './operations'
import { notifyPendingSyncFinished, requestPendingSync } from './sync-trigger'

export interface OfflineOperationChanges {
  readonly status?: OfflineOperationStatus
  readonly entityServerId?: string | null
  readonly payload?: unknown
  readonly details?: unknown
  readonly dependencyIds?: readonly string[]
  readonly attempts?: number
  readonly lastError?: string | null
  readonly nextAttemptAt?: string | null
  readonly baseRevision?: string | null
  readonly blobKeys?: readonly string[]
}

export interface ListOperationsOptions {
  readonly ownerKey?: string
  readonly entityType?: OfflineEntityType
  readonly operationType?: OfflineOperationType
  readonly statuses?: readonly OfflineOperationStatus[]
}

function operationSort(
  left: OfflineOperation,
  right: OfflineOperation,
): number {
  return (
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  )
}

export async function getOperation(
  id: string,
): Promise<OfflineOperation | undefined> {
  const database = await getOfflineRxDatabase()
  const document = await database.operations.findOne(id).exec()
  return document?.toJSON() as OfflineOperation | undefined
}

export async function listOperations(
  options: ListOperationsOptions = {},
): Promise<OfflineOperation[]> {
  const database = await getOfflineRxDatabase()
  const operations = (await database.operations.find().exec()).map(
    (document) => document.toJSON() as OfflineOperation,
  )
  const ownerKey = options.ownerKey ?? DEFAULT_OWNER_KEY
  return operations
    .filter(
      (operation) =>
        operation.ownerKey === ownerKey &&
        (options.entityType === undefined ||
          operation.entityType === options.entityType) &&
        (options.operationType === undefined ||
          operation.operationType === options.operationType) &&
        (options.statuses === undefined ||
          options.statuses.includes(operation.status)),
    )
    .sort(operationSort)
}

export async function putOperation(operation: OfflineOperation): Promise<void> {
  const database = await getOfflineRxDatabase()
  const existing = await getOperation(operation.id)
  if (existing && isTerminalOperationStatus(existing.status)) {
    throw new Error('A completed offline operation cannot be replaced')
  }
  await database.operations.upsert(operation)
}

export async function updateOperation(
  id: string,
  changes: OfflineOperationChanges,
): Promise<void> {
  const existing = await getOperation(id)
  if (!existing) return
  if (isTerminalOperationStatus(existing.status)) {
    throw new Error('A completed offline operation cannot be changed')
  }
  const status = changes.status ?? existing.status
  if (
    status !== existing.status &&
    !canTransitionOperationStatus(existing.status, status)
  ) {
    throw new Error(
      `Cannot move an offline operation from ${existing.status} to ${status}`,
    )
  }
  const now = new Date().toISOString()
  await putOperation({
    ...existing,
    ...changes,
    status,
    updatedAt: now,
    acknowledgedAt:
      status === 'acknowledged'
        ? (existing.acknowledgedAt ?? now)
        : existing.acknowledgedAt,
    cancelledAt:
      status === 'cancelled'
        ? (existing.cancelledAt ?? now)
        : existing.cancelledAt,
  })
}

export async function claimOperation(id: string): Promise<boolean> {
  const existing = await getOperation(id)
  if (
    !existing ||
    (existing.status !== 'pending' && existing.status !== 'retryable')
  )
    return false
  await putOperation({
    ...existing,
    status: 'in-flight',
    attempts: existing.attempts + 1,
    updatedAt: new Date().toISOString(),
  })
  return true
}

export async function acknowledgeOperation(
  id: string,
  options: { readonly serverId?: string | null } = {},
): Promise<void> {
  const existing = await getOperation(id)
  await updateOperation(id, {
    status: 'acknowledged',
    ...(options.serverId === undefined
      ? {}
      : { entityServerId: options.serverId }),
  })
  for (const blobKey of existing?.blobKeys ?? []) {
    await deleteOfflineBlob(blobKey).catch(() => undefined)
  }
}

export async function cancelOperation(id: string): Promise<boolean> {
  const existing = await getOperation(id)
  if (!existing || isTerminalOperationStatus(existing.status)) return false
  if (existing.status === 'in-flight') {
    throw new Error(
      'Wait for the current sync to finish before discarding this operation',
    )
  }
  await updateOperation(id, {
    status: 'cancelled',
    payload: null,
    details: null,
    blobKeys: [],
    lastError: null,
  })
  for (const blobKey of existing.blobKeys)
    await deleteOfflineBlob(blobKey).catch(() => undefined)
  notifyPendingSyncFinished()
  return true
}

export async function retryOperation(id: string): Promise<void> {
  await updateOperation(id, {
    status: 'pending',
    lastError: null,
    nextAttemptAt: null,
  })
  requestPendingSync()
}

/** Retries an edit without its base revision, intentionally keeping local data. */
export async function forceOperation(id: string): Promise<void> {
  await updateOperation(id, {
    status: 'pending',
    baseRevision: null,
    lastError: null,
    nextAttemptAt: null,
  })
  requestPendingSync()
}

export async function discardOperation(id: string): Promise<void> {
  const operation = await getOperation(id)
  const cancelled = await cancelOperation(id)
  if (!cancelled || !operation?.entityServerId) return

  const cacheType =
    operation.entityType === 'brew' || operation.entityType === 'brew-image'
      ? 'brew'
      : operation.entityType === 'recipe'
        ? 'recipe'
        : null
  const mutatesEntity =
    operation.operationType === 'update' ||
    operation.operationType === 'delete' ||
    operation.operationType === 'remove-image'
  if (!cacheType || !mutatesEntity) return

  const cached = await getLocalEntityByServerId(
    cacheType,
    operation.entityServerId,
  )
  if (cached) {
    await removeLocalEntity(cacheType, cached.localId)
  }
}

/**
 * A tab can be closed after claiming work but before writing a result. Those
 * records become retryable on the next hydration so they do not stay stuck.
 */
export async function recoverInterruptedOperations(
  ownerKey: string = DEFAULT_OWNER_KEY,
): Promise<number> {
  const interrupted = await listOperations({
    ownerKey,
    statuses: ['in-flight'],
  })
  for (const operation of interrupted) {
    await updateOperation(operation.id, {
      status: 'retryable',
      lastError: 'The previous sync was interrupted',
    })
  }
  return interrupted.length
}
