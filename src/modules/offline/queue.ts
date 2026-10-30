import {
  acknowledgeOperation,
  cancelOperation,
  getOperation,
  listOperations,
  type OfflineOperationChanges,
  putOperation,
  updateOperation,
} from './operation-queue'
import {
  operationToPendingBrew,
  pendingBrewStatusToOperation,
  pendingBrewToOperation,
} from './pending-brew-operation'
import type { PendingBrew } from './types'

export { resetOfflineDatabaseForTests } from './storage'

export async function listPendingBrews(): Promise<PendingBrew[]> {
  const operations = await listOperations({
    entityType: 'brew',
    operationType: 'create',
  })
  return operations
    .map(operationToPendingBrew)
    .filter((item): item is PendingBrew => item !== null)
}

export async function getPendingBrew(
  operationId: string,
): Promise<PendingBrew | undefined> {
  const operation = await getOperation(operationId)
  return operation
    ? (operationToPendingBrew(operation) ?? undefined)
    : undefined
}

export async function putPendingBrew(item: PendingBrew): Promise<void> {
  await putOperation(pendingBrewToOperation(item))
}

export async function updatePendingBrew(
  operationId: string,
  changes: Partial<Omit<PendingBrew, 'operationId'>>,
): Promise<void> {
  const existing = await getOperation(operationId)
  if (!existing || operationToPendingBrew(existing) === null) return

  const operationChanges: OfflineOperationChanges = {
    ...(changes.payload === undefined ? {} : { payload: changes.payload }),
    ...(changes.summary === undefined ? {} : { details: changes.summary }),
    ...(changes.attempts === undefined ? {} : { attempts: changes.attempts }),
    ...('lastError' in changes ? { lastError: changes.lastError ?? null } : {}),
    ...(changes.status === undefined
      ? {}
      : { status: pendingBrewStatusToOperation(changes.status) }),
  }
  await updateOperation(operationId, operationChanges)
}

export async function deletePendingBrew(operationId: string): Promise<void> {
  // Keep the operation record as a local tombstone. `getPendingBrew` and
  // `listPendingBrews` hide cancelled and acknowledged records.
  await cancelOperation(operationId)
}

export async function acknowledgePendingBrew(
  operationId: string,
): Promise<void> {
  await acknowledgeOperation(operationId)
}
