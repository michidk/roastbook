import { deleteOfflineBlob } from './blob-store'
import {
  canTransitionOperationStatus,
  DEFAULT_OWNER_KEY,
  isTerminalOperationStatus,
  type OfflineEntityType,
  type OfflineOperation,
  type OfflineOperationStatus,
  type OfflineOperationType,
} from './operations'
import {
  OPERATIONS_STORE,
  openOfflineDatabase,
  requestToPromise,
  transactionToPromise,
} from './storage'
import { requestPendingSync } from './sync-trigger'

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
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OPERATIONS_STORE, 'readonly')
  const operation = (await requestToPromise(
    transaction.objectStore(OPERATIONS_STORE).get(id),
  )) as OfflineOperation | undefined
  await transactionToPromise(transaction)
  return operation
}

export async function listOperations(
  options: ListOperationsOptions = {},
): Promise<OfflineOperation[]> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OPERATIONS_STORE, 'readonly')
  const operations = (await requestToPromise(
    transaction.objectStore(OPERATIONS_STORE).getAll(),
  )) as OfflineOperation[]
  await transactionToPromise(transaction)

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
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OPERATIONS_STORE, 'readwrite')
  const store = transaction.objectStore(OPERATIONS_STORE)
  const existing = (await requestToPromise(store.get(operation.id))) as
    | OfflineOperation
    | undefined
  if (existing && isTerminalOperationStatus(existing.status)) {
    throw new Error('A completed offline operation cannot be replaced')
  }
  store.put(operation)
  await transactionToPromise(transaction)
}

export async function updateOperation(
  id: string,
  changes: OfflineOperationChanges,
): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OPERATIONS_STORE, 'readwrite')
  const store = transaction.objectStore(OPERATIONS_STORE)
  const existing = (await requestToPromise(store.get(id))) as
    | OfflineOperation
    | undefined
  if (!existing) {
    return
  }
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
  const updated: OfflineOperation = {
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
  }
  store.put(updated)
  await transactionToPromise(transaction)
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

export async function cancelOperation(id: string): Promise<void> {
  const existing = await getOperation(id)
  if (!existing || isTerminalOperationStatus(existing.status)) return
  if (existing.status === 'in-flight') {
    throw new Error(
      'Wait for the current sync to finish before discarding this operation',
    )
  }
  await updateOperation(id, { status: 'cancelled' })
  for (const blobKey of existing.blobKeys) {
    await deleteOfflineBlob(blobKey).catch(() => undefined)
  }
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
  await cancelOperation(id)
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
