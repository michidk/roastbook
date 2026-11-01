import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  applyEntityRevision,
  executeOperation,
  markBrewSynced,
} from '@/lib/client/journal-sync-operations'
import {
  isConnectionOnline,
  subscribeToConnection,
} from '@/lib/connection-status'
import { checkAuthentication } from '@/modules/offline/auth'
import {
  getLocalEntityByServerId,
  putLocalEntity,
  recordSuccessfulSync,
  refreshServerEntitySyncState,
  removeLocalEntity,
} from '@/modules/offline/local-data'
import {
  acknowledgeOperation,
  claimOperation,
  listOperations,
  recoverInterruptedOperations,
  updateOperation,
} from '@/modules/offline/operation-queue'
import { usePendingBrewsStore } from '@/modules/offline/pending-store'
import { withOfflineSyncLock } from '@/modules/offline/sync-lock'
import { syncOperations } from '@/modules/offline/sync-operations'
import {
  INITIAL_SYNC_RETRY_DELAY_MS,
  nextSyncRetryDelay,
  shouldAnnounceAuthRequired,
  shouldScheduleSyncRetry,
} from '@/modules/offline/sync-policy'
import {
  notifyPendingSyncFinished,
  subscribeToPendingSync,
} from '@/modules/offline/sync-trigger'
import { isPendingBrewHeldForTasting } from '@/modules/offline/tasting-holds'

const PREFETCH_TIMEOUT_MS = 3000
let activeSyncOwner: object | null = null

export function useJournalSync() {
  const router = useRouter()

  useEffect(() => {
    if (DEMO_MODE || !isConnectionOnline()) return

    let cancelled = false
    const prefetch = () => {
      if (cancelled || !isConnectionOnline()) return
      void router.preloadRoute({ to: '/brews/new' }).catch(() => undefined)
      void router.preloadRoute({ to: '/brews/pending' }).catch(() => undefined)
    }
    const supportsIdleCallback = 'requestIdleCallback' in window
    const handle = supportsIdleCallback
      ? window.requestIdleCallback(prefetch, { timeout: PREFETCH_TIMEOUT_MS })
      : window.setTimeout(prefetch, PREFETCH_TIMEOUT_MS)

    return () => {
      cancelled = true
      if (supportsIdleCallback) {
        window.cancelIdleCallback(handle)
      } else {
        window.clearTimeout(handle)
      }
    }
  }, [router])

  useEffect(() => {
    if (DEMO_MODE) return

    void usePendingBrewsStore.getState().hydrate()
    let retryTimer: number | null = null
    let retryDelay = INITIAL_SYNC_RETRY_DELAY_MS
    let authNotified = false
    let disposed = false
    let syncInFlight: Promise<void> | null = null
    let syncQueued = false
    const syncOwner = {}

    const runSync = (): Promise<void> => {
      if (syncInFlight) {
        syncQueued = true
        return syncInFlight
      }

      syncInFlight = Promise.resolve().then(async () => {
        try {
          if (!isConnectionOnline()) return

          const result = await withOfflineSyncLock(async () => {
            if (disposed || !isConnectionOnline()) return null

            activeSyncOwner = syncOwner
            usePendingBrewsStore.getState().setSyncing(true)
            try {
              await recoverInterruptedOperations()
              const syncResult = await syncOperations({
                list: async () =>
                  (await listOperations()).filter(
                    (operation) => !isPendingBrewHeldForTasting(operation.id),
                  ),
                claim: (operation) => claimOperation(operation.id),
                acknowledge: (operation, executionResult) =>
                  acknowledgeOperation(operation.id, {
                    serverId: executionResult.serverId ?? null,
                  }),
                mark: (operation, changes) =>
                  updateOperation(operation.id, changes),
                execute: executeOperation,
                authenticate: checkAuthentication,
                isOnline: () => isConnectionOnline(),
                onAcknowledged: async (operation, executionResult) => {
                  const serverId = executionResult.serverId
                  if (!serverId) return
                  const revision = executionResult.revision

                  if (operation.entityType === 'brew-image') {
                    const imagePayload = operation.payload as {
                      readonly entityType?: string
                      readonly entityId?: number
                    }
                    if (
                      imagePayload.entityType === 'shots' &&
                      imagePayload.entityId !== undefined
                    ) {
                      await refreshServerEntitySyncState(
                        'brew',
                        String(imagePayload.entityId),
                      )
                    }
                  }

                  if (
                    operation.entityType === 'brew' &&
                    (operation.operationType === 'create' ||
                      operation.operationType === 'update')
                  ) {
                    await markBrewSynced(operation, serverId)
                    if (operation.operationType === 'update' && revision) {
                      await applyEntityRevision('brew', serverId, revision)
                    }
                    return
                  }

                  if (
                    (operation.entityType === 'brew' ||
                      operation.entityType === 'recipe') &&
                    operation.operationType === 'delete'
                  ) {
                    const cached = await getLocalEntityByServerId(
                      operation.entityType,
                      serverId,
                    )
                    if (cached) {
                      await removeLocalEntity(
                        operation.entityType,
                        cached.localId,
                      ).catch(() => undefined)
                    }
                    return
                  }

                  if (
                    operation.entityType === 'recipe' &&
                    operation.operationType === 'update'
                  ) {
                    if (revision) {
                      await applyEntityRevision('recipe', serverId, revision)
                    } else {
                      const cached = await getLocalEntityByServerId(
                        'recipe',
                        serverId,
                      )
                      if (cached) {
                        await putLocalEntity({
                          ...cached,
                          syncState: 'synced',
                          updatedAt: new Date().toISOString(),
                        })
                      }
                    }
                  }
                },
              })
              await usePendingBrewsStore.getState().refresh()
              if (
                (syncResult.synced > 0 || syncResult.failed > 0) &&
                !syncResult.authRequired &&
                !syncResult.stoppedByNetwork
              ) {
                await recordSuccessfulSync().catch(() => undefined)
              }
              return syncResult
            } finally {
              if (activeSyncOwner === syncOwner) {
                activeSyncOwner = null
                usePendingBrewsStore.getState().setSyncing(false)
              }
            }
          })
          if (!result || disposed) return

          if (result.synced > 0) {
            if (!router.state.location.pathname.startsWith('/brews/new')) {
              await router.invalidate().catch(() => undefined)
            }
          }

          const includeAuth = shouldAnnounceAuthRequired(
            result.authRequired,
            authNotified,
          )
          const problems = result.failed > 0 || includeAuth
          const parts = [
            result.synced > 0
              ? `${result.synced} brew${result.synced === 1 ? '' : 's'} synced`
              : null,
            includeAuth ? 'sign in to sync' : null,
            result.failed > 0
              ? `${result.failed} need${result.failed === 1 ? 's' : ''} attention`
              : null,
          ].filter((part): part is string => part !== null)

          if (parts.length > 0) {
            const notify = problems ? toast.warning : toast.success
            notify(parts.join(' · '), {
              action: {
                label: problems ? 'Review pending' : 'View brews',
                onClick: () =>
                  void router.navigate({
                    to: problems ? '/brews/pending' : '/brews',
                  }),
              },
            })
          }

          authNotified = result.authRequired
          if (
            (result.stoppedByNetwork || result.retryable) &&
            isConnectionOnline()
          ) {
            scheduleRetry()
          } else clearRetry()
        } catch (error) {
          if (disposed) return
          // A failed flush leaves the queue intact. Retry local/transient
          // failures while online; a successful sync resets the backoff.
          console.error('Offline sync flush failed', error)
          scheduleRetry()
        } finally {
          syncInFlight = null
          notifyPendingSyncFinished()
          if (!disposed && syncQueued) {
            syncQueued = false
            void runSync()
          }
        }
      })

      return syncInFlight
    }

    function scheduleRetry() {
      if (
        !shouldScheduleSyncRetry({
          online: isConnectionOnline(),
          disposed,
          hasTimer: retryTimer !== null,
        })
      ) {
        return
      }
      const delay = retryDelay
      retryTimer = window.setTimeout(() => {
        retryTimer = null
        retryDelay = nextSyncRetryDelay(retryDelay)
        void runSync()
      }, delay)
    }

    function clearRetry() {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer)
        retryTimer = null
      }
      retryDelay = INITIAL_SYNC_RETRY_DELAY_MS
    }

    const handleOnline = () => {
      clearRetry()
      void runSync()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearRetry()
        void runSync()
      }
    }
    const handleManualSync = () => {
      clearRetry()
      void runSync()
    }

    const unsubscribeConnection = subscribeToConnection(() => {
      if (isConnectionOnline()) handleOnline()
    })
    document.addEventListener('visibilitychange', handleVisibility)
    const unsubscribe = subscribeToPendingSync(handleManualSync)

    if (isConnectionOnline()) void runSync()

    return () => {
      disposed = true
      if (activeSyncOwner === syncOwner) {
        activeSyncOwner = null
        usePendingBrewsStore.getState().setSyncing(false)
      }
      clearRetry()
      unsubscribeConnection()
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribe()
    }
  }, [router])

  return null
}
