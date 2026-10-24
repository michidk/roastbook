import { getErrorMessage } from '@/lib/error-message'
import type { AuthenticationState } from '@/modules/offline/auth'
import {
  isConflictError,
  isDefinitiveSyncError,
  isNetworkError,
} from '@/modules/offline/errors'
import {
  isRunnableOperationStatus,
  type OfflineOperation,
  type OfflineOperationStatus,
  orderRunnableOperations,
} from '@/modules/offline/operations'

export interface OperationExecutionResult {
  readonly serverId?: string | null
}

export interface SyncOperationsDependencies {
  readonly list: () => Promise<OfflineOperation[]>
  readonly claim: (operation: OfflineOperation) => Promise<void>
  readonly acknowledge: (
    operation: OfflineOperation,
    result: OperationExecutionResult,
  ) => Promise<void>
  readonly mark: (
    operation: OfflineOperation,
    changes: {
      readonly status: OfflineOperationStatus
      readonly lastError?: string | null
    },
  ) => Promise<void>
  readonly execute: (
    operation: OfflineOperation,
  ) => Promise<OperationExecutionResult | undefined>
  readonly authenticate: () => Promise<AuthenticationState>
  readonly isOnline: () => boolean
  readonly now?: () => Date
  readonly onAcknowledged?: (
    operation: OfflineOperation,
    result: OperationExecutionResult,
  ) => Promise<void>
}

export interface SyncOperationsResult {
  readonly synced: number
  readonly authRequired: boolean
  readonly stoppedByNetwork: boolean
  readonly failed: number
}

function syncResult(
  synced: number,
  failed: number,
  options: Partial<
    Pick<SyncOperationsResult, 'authRequired' | 'stoppedByNetwork'>
  > = {},
): SyncOperationsResult {
  return {
    synced,
    failed,
    authRequired: options.authRequired ?? false,
    stoppedByNetwork: options.stoppedByNetwork ?? false,
  }
}

async function markRunnableAuthRequired(
  dependencies: SyncOperationsDependencies,
  exceptId?: string,
): Promise<void> {
  for (const operation of await dependencies.list()) {
    if (
      operation.id !== exceptId &&
      isRunnableOperationStatus(operation.status)
    ) {
      await dependencies.mark(operation, {
        status: 'auth-required',
        lastError: null,
      })
    }
  }
}

export async function syncOperations(
  dependencies: SyncOperationsDependencies,
): Promise<SyncOperationsResult> {
  if (!dependencies.isOnline()) {
    return syncResult(0, 0, { stoppedByNetwork: true })
  }

  const initialOperations = await dependencies.list()
  if (
    orderRunnableOperations(
      initialOperations,
      dependencies.now?.() ?? new Date(),
    ).length === 0
  ) {
    return syncResult(0, 0)
  }

  const authentication = await dependencies.authenticate()
  if (authentication === 'unreachable') {
    return syncResult(0, 0, { stoppedByNetwork: true })
  }
  if (authentication === 'auth-required') {
    await markRunnableAuthRequired(dependencies)
    return syncResult(0, 0, { authRequired: true })
  }

  let synced = 0
  let failed = 0

  while (dependencies.isOnline()) {
    const operations = await dependencies.list()
    const next = orderRunnableOperations(
      operations,
      dependencies.now?.() ?? new Date(),
    )[0]
    if (!next) break

    await dependencies.claim(next)

    try {
      const result = (await dependencies.execute(next)) ?? {}
      await dependencies.acknowledge(next, result)
      if (dependencies.onAcknowledged) {
        await dependencies.onAcknowledged(next, result).catch(() => undefined)
      }
      synced += 1
    } catch (error) {
      if (isNetworkError(error) || !dependencies.isOnline()) {
        await dependencies.mark(next, {
          status: 'retryable',
          lastError: getErrorMessage(error, 'The connection was lost'),
        })
        return syncResult(synced, failed, { stoppedByNetwork: true })
      }

      const authenticationAfterFailure = await dependencies.authenticate()
      if (authenticationAfterFailure === 'unreachable') {
        await dependencies.mark(next, {
          status: 'retryable',
          lastError: getErrorMessage(error, 'The connection was lost'),
        })
        return syncResult(synced, failed, { stoppedByNetwork: true })
      }
      if (authenticationAfterFailure === 'auth-required') {
        await dependencies.mark(next, {
          status: 'auth-required',
          lastError: null,
        })
        await markRunnableAuthRequired(dependencies, next.id)
        return syncResult(synced, failed, { authRequired: true })
      }

      const message = getErrorMessage(error, 'Could not sync this operation')
      if (isConflictError(error)) {
        await dependencies.mark(next, {
          status: 'conflict',
          lastError: message,
        })
        failed += 1
        continue
      }
      if (!isDefinitiveSyncError(error)) {
        await dependencies.mark(next, {
          status: 'retryable',
          lastError: message,
        })
        return syncResult(synced, failed, { stoppedByNetwork: true })
      }

      await dependencies.mark(next, {
        status: 'permanent',
        lastError: message,
      })
      failed += 1
    }
  }

  return syncResult(synced, failed, {
    stoppedByNetwork: !dependencies.isOnline(),
  })
}
