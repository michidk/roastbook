import {
  DEFAULT_OWNER_KEY,
  type OfflineOperation,
  type OfflineOperationStatus,
} from './operations'
import type {
  PendingBrew,
  PendingBrewPayload,
  PendingBrewStatus,
  PendingBrewSummary,
} from './types'

export function pendingBrewToOperation(
  item: PendingBrew,
): OfflineOperation<PendingBrewPayload> {
  return {
    id: item.operationId,
    idempotencyKey: item.operationId,
    ownerKey: DEFAULT_OWNER_KEY,
    entityType: 'brew',
    operationType: 'create',
    entityLocalId: item.operationId,
    entityServerId: null,
    payload: item.payload,
    details: item.summary,
    dependencyIds: [],
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    status: pendingBrewStatusToOperation(item.status),
    attempts: item.attempts,
    lastError: item.lastError ?? null,
    nextAttemptAt: null,
    baseRevision: null,
    acknowledgedAt: null,
    cancelledAt: null,
    blobKeys: [],
  }
}

export function operationToPendingBrew(
  operation: OfflineOperation,
): PendingBrew | null {
  if (operation.entityType !== 'brew' || operation.operationType !== 'create') {
    return null
  }

  const status = operationStatusToPendingBrew(operation.status)
  if (status === null) return null

  return {
    operationId: operation.id,
    payload: operation.payload as PendingBrewPayload,
    summary: pendingBrewSummary(operation.details, operation.createdAt),
    createdAt: operation.createdAt,
    attempts: operation.attempts,
    status,
    ...(operation.lastError ? { lastError: operation.lastError } : {}),
  }
}

export function pendingBrewStatusToOperation(
  status: PendingBrewStatus,
): OfflineOperationStatus {
  if (status === 'auth-required') return 'auth-required'
  if (status === 'failed') return 'permanent'
  return 'pending'
}

export function operationStatusToPendingBrew(
  status: OfflineOperationStatus,
): PendingBrewStatus | null {
  if (status === 'acknowledged' || status === 'cancelled') return null
  if (status === 'auth-required') return 'auth-required'
  if (status === 'permanent' || status === 'conflict') {
    return 'failed'
  }
  return 'pending'
}

function pendingBrewSummary(
  details: unknown,
  fallbackBrewedAt: string,
): PendingBrewSummary {
  if (details && typeof details === 'object') {
    const value = details as Partial<PendingBrewSummary>
    if (
      typeof value.methodName === 'string' &&
      typeof value.brewedAt === 'string'
    ) {
      return {
        beanName: typeof value.beanName === 'string' ? value.beanName : null,
        methodName: value.methodName,
        brewedAt: value.brewedAt,
        doseGrams: typeof value.doseGrams === 'string' ? value.doseGrams : null,
        yieldGrams:
          typeof value.yieldGrams === 'string' ? value.yieldGrams : null,
        shotTimeSeconds:
          typeof value.shotTimeSeconds === 'string'
            ? value.shotTimeSeconds
            : null,
      }
    }
  }

  return {
    beanName: null,
    methodName: 'Brew',
    brewedAt: fallbackBrewedAt,
    doseGrams: null,
    yieldGrams: null,
    shotTimeSeconds: null,
  }
}
