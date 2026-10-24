export const DEFAULT_OWNER_KEY = 'local'

export const OFFLINE_ENTITY_TYPES = [
  'brew',
  'brew-image',
  'recipe',
  'bean',
  'bean-purchase',
  'gear',
  'drink',
  'tag',
  'settings',
] as const

export type OfflineEntityType = (typeof OFFLINE_ENTITY_TYPES)[number]

export const OFFLINE_OPERATION_TYPES = [
  'create',
  'update',
  'delete',
  'upload',
  'remove-image',
  'save-to-recipe',
] as const

export type OfflineOperationType = (typeof OFFLINE_OPERATION_TYPES)[number]

export const OFFLINE_OPERATION_STATUSES = [
  'pending',
  'in-flight',
  'retryable',
  'permanent',
  'auth-required',
  'conflict',
  'cancelled',
  'acknowledged',
] as const

export type OfflineOperationStatus = (typeof OFFLINE_OPERATION_STATUSES)[number]

export interface OfflineOperation<TPayload = unknown> {
  readonly id: string
  readonly idempotencyKey: string
  readonly ownerKey: string
  readonly entityType: OfflineEntityType
  readonly operationType: OfflineOperationType
  readonly entityLocalId: string
  readonly entityServerId: string | null
  readonly payload: TPayload
  /** Non-sensitive presentation data for the pending UI. */
  readonly details: unknown
  readonly dependencyIds: readonly string[]
  readonly createdAt: string
  readonly updatedAt: string
  readonly status: OfflineOperationStatus
  readonly attempts: number
  readonly lastError: string | null
  readonly nextAttemptAt: string | null
  readonly baseRevision: string | null
  readonly acknowledgedAt: string | null
  readonly cancelledAt: string | null
  readonly blobKeys: readonly string[]
}

const ALLOWED_TRANSITIONS: Record<
  OfflineOperationStatus,
  readonly OfflineOperationStatus[]
> = {
  pending: [
    'in-flight',
    'retryable',
    'permanent',
    'auth-required',
    'conflict',
    'acknowledged',
    'cancelled',
  ],
  'in-flight': [
    'pending',
    'retryable',
    'permanent',
    'auth-required',
    'conflict',
    'acknowledged',
    'cancelled',
  ],
  retryable: [
    'pending',
    'in-flight',
    'permanent',
    'auth-required',
    'conflict',
    'cancelled',
  ],
  permanent: ['pending', 'in-flight', 'cancelled'],
  'auth-required': ['pending', 'in-flight', 'cancelled'],
  conflict: ['pending', 'in-flight', 'cancelled'],
  cancelled: [],
  acknowledged: [],
}

export function canTransitionOperationStatus(
  from: OfflineOperationStatus,
  to: OfflineOperationStatus,
): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to)
}

export function isTerminalOperationStatus(
  status: OfflineOperationStatus,
): boolean {
  return status === 'acknowledged' || status === 'cancelled'
}

export function isVisibleOperationStatus(
  status: OfflineOperationStatus,
): boolean {
  return !isTerminalOperationStatus(status)
}

export function isRunnableOperationStatus(
  status: OfflineOperationStatus,
): boolean {
  return status === 'pending' || status === 'retryable'
}

function operationTime(operation: OfflineOperation): number {
  const value = Date.parse(operation.createdAt)
  return Number.isNaN(value) ? 0 : value
}

export function compareOperations(
  left: OfflineOperation,
  right: OfflineOperation,
): number {
  const timeDifference = operationTime(left) - operationTime(right)
  if (timeDifference !== 0) return timeDifference
  return left.id.localeCompare(right.id)
}

function isReady(
  operation: OfflineOperation,
  byId: ReadonlyMap<string, OfflineOperation>,
  now: number,
): boolean {
  if (!isRunnableOperationStatus(operation.status)) return false
  if (
    operation.nextAttemptAt !== null &&
    Date.parse(operation.nextAttemptAt) > now
  ) {
    return false
  }
  return operation.dependencyIds.every(
    (dependencyId) => byId.get(dependencyId)?.status === 'acknowledged',
  )
}

/**
 * Returns the operations whose dependencies are acknowledged and whose retry
 * time has arrived. Callers run the first item, acknowledge it, then call this
 * again so dependent operations become runnable in the same flush.
 */
export function orderRunnableOperations(
  operations: readonly OfflineOperation[],
  now: Date = new Date(),
): OfflineOperation[] {
  const byId = new Map(operations.map((operation) => [operation.id, operation]))
  return operations
    .filter((operation) => isReady(operation, byId, now.getTime()))
    .sort(compareOperations)
}
