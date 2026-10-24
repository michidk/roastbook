import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { DEMO_MODE } from '@/lib/build-mode'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import {
  deleteEntityImage,
  type EntityType,
  uploadEntityImage,
} from '@/lib/server/images'
import { createRecipe, deleteRecipe, updateRecipe } from '@/lib/server/recipes'
import {
  createShot,
  createShotAndSaveRecipe,
  deleteShot,
  updateShot,
} from '@/lib/server/shots'
import { checkAuthentication } from '@/modules/offline/auth'
import { getOfflineBlob } from '@/modules/offline/blob-store'
import {
  getLocalEntityByServerId,
  markLocalEntitySynced,
  putLocalEntity,
  recordSuccessfulSync,
  removeLocalEntity,
} from '@/modules/offline/local-data'
import {
  acknowledgeOperation,
  listOperations,
  recoverInterruptedOperations,
  updateOperation,
} from '@/modules/offline/operation-queue'
import type { OfflineOperation } from '@/modules/offline/operations'
import { usePendingBrewsStore } from '@/modules/offline/pending-store'
import { withOfflineSyncLock } from '@/modules/offline/sync-lock'
import {
  type OperationExecutionResult,
  syncOperations,
} from '@/modules/offline/sync-operations'
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
import type { PendingBrewPayload } from '@/modules/offline/types'

const PREFETCH_TIMEOUT_MS = 3000
let activeSyncOwner: object | null = null

function updatePayload(operation: OfflineOperation): Record<string, unknown> {
  const { baseUpdatedAt: _baseUpdatedAt, ...payload } =
    operation.payload as Record<string, unknown>
  return operation.baseRevision
    ? { ...payload, baseUpdatedAt: operation.baseRevision }
    : payload
}

async function executeBrewOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  if (operation.operationType === 'create') {
    const shot = await createShot({
      data: operation.payload as PendingBrewPayload,
    })
    return { serverId: String(shot.id) }
  }
  if (operation.operationType === 'update') {
    const shot = await updateShot({
      data: updatePayload(operation) as NonNullable<
        Parameters<typeof updateShot>[0]
      >['data'],
    })
    return { serverId: String(shot.id) }
  }
  if (operation.operationType === 'delete') {
    const id = Number(operation.entityServerId ?? operation.entityLocalId)
    await deleteShot({
      data: {
        id,
        ...(operation.baseRevision
          ? { baseUpdatedAt: operation.baseRevision }
          : {}),
        idempotent: true,
      },
    })
    return { serverId: String(id) }
  }
  if (operation.operationType === 'save-to-recipe') {
    const result = await createShotAndSaveRecipe({
      data: operation.payload as NonNullable<
        Parameters<typeof createShotAndSaveRecipe>[0]
      >['data'],
    })
    return { serverId: String(result.shot.id) }
  }

  throw new Error(`Unsupported brew operation: ${operation.operationType}`)
}

async function executeRecipeOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  if (operation.operationType === 'create') {
    const recipe = await createRecipe({
      data: operation.payload as NonNullable<
        Parameters<typeof createRecipe>[0]
      >['data'],
    })
    return { serverId: String(recipe.id) }
  }
  if (operation.operationType === 'update') {
    const recipe = await updateRecipe({
      data: updatePayload(operation) as NonNullable<
        Parameters<typeof updateRecipe>[0]
      >['data'],
    })
    return { serverId: String(recipe.id) }
  }
  if (operation.operationType === 'delete') {
    const id = Number(operation.entityServerId ?? operation.entityLocalId)
    await deleteRecipe({
      data: {
        id,
        ...(operation.baseRevision
          ? { baseUpdatedAt: operation.baseRevision }
          : {}),
        idempotent: true,
      },
    })
    return { serverId: String(id) }
  }

  throw new Error(`Unsupported recipe operation: ${operation.operationType}`)
}

async function executeBrewImageOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  const payload = operation.payload as {
    readonly entityType?: EntityType
    readonly entityId?: number
    readonly imageId?: number
    readonly clientOperationId?: string
    readonly idempotent?: boolean
  }
  const entityType = payload.entityType ?? 'shots'
  const entityId = payload.entityId ?? Number(operation.entityServerId)

  if (operation.operationType === 'upload') {
    const blobKey = operation.blobKeys[0]
    if (!blobKey) throw new Error('Image data is missing from this device')
    const record = await getOfflineBlob(blobKey)
    if (!record) throw new Error('Image data is missing from this device')
    const file = new File([record.blob], record.filename, {
      type: record.mimeType,
    })
    const image = await uploadEntityImage({
      data: createEntityImageUploadFormData(
        entityType,
        entityId,
        file,
        payload.clientOperationId,
      ),
    })
    return { serverId: String(image.id) }
  }
  if (operation.operationType === 'remove-image') {
    await deleteEntityImage({
      data: {
        entityType,
        entityId,
        imageId: payload.imageId ?? 0,
        idempotent: true,
      },
    })
    return { serverId: String(entityId) }
  }

  throw new Error(`Unsupported image operation: ${operation.operationType}`)
}

async function executeOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  if (operation.entityType === 'brew') return executeBrewOperation(operation)
  if (operation.entityType === 'recipe') {
    return executeRecipeOperation(operation)
  }
  if (operation.entityType === 'brew-image') {
    return executeBrewImageOperation(operation)
  }

  throw new Error(
    `Unsupported offline operation: ${operation.entityType}/${operation.operationType}`,
  )
}

async function markBrewSynced(
  operation: OfflineOperation,
  serverId: string,
): Promise<void> {
  const existingByServer = await getLocalEntityByServerId('brew', serverId)
  if (existingByServer) {
    if (existingByServer.localId !== operation.entityLocalId) {
      await removeLocalEntity('brew', operation.entityLocalId).catch(
        () => undefined,
      )
    }
    await putLocalEntity({
      ...existingByServer,
      syncState: 'synced',
      updatedAt: new Date().toISOString(),
    })
    return
  }

  const synced = await markLocalEntitySynced('brew', operation.entityLocalId, {
    serverId,
  })
  if (!synced) {
    await putLocalEntity({
      entityType: 'brew',
      localId: operation.entityLocalId,
      serverId,
      data: operation.payload,
      syncState: 'synced',
    })
  }
}

export function OfflineSyncManager() {
  const router = useRouter()

  useEffect(() => {
    if (DEMO_MODE || !navigator.onLine) return

    let cancelled = false
    const prefetch = () => {
      if (cancelled || !navigator.onLine) return
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

      syncInFlight = (async () => {
        try {
          if (!navigator.onLine) return

          const result = await withOfflineSyncLock(async () => {
            if (disposed || !navigator.onLine) return null

            activeSyncOwner = syncOwner
            usePendingBrewsStore.getState().setSyncing(true)
            try {
              await recoverInterruptedOperations()
              const syncResult = await syncOperations({
                list: async () =>
                  (await listOperations()).filter(
                    (operation) => !isPendingBrewHeldForTasting(operation.id),
                  ),
                claim: (operation) =>
                  updateOperation(operation.id, {
                    status: 'in-flight',
                    attempts: operation.attempts + 1,
                  }),
                acknowledge: (operation, executionResult) =>
                  acknowledgeOperation(operation.id, {
                    serverId: executionResult.serverId ?? null,
                  }),
                mark: (operation, changes) =>
                  updateOperation(operation.id, changes),
                execute: executeOperation,
                authenticate: checkAuthentication,
                isOnline: () => navigator.onLine,
                onAcknowledged: async (operation, executionResult) => {
                  if (
                    operation.entityType === 'brew-image' &&
                    operation.entityServerId
                  ) {
                    const imagePayload = operation.payload as {
                      readonly entityType?: EntityType
                    }
                    const cacheType =
                      imagePayload.entityType === 'shots'
                        ? 'brew'
                        : imagePayload.entityType === 'gear'
                          ? 'gear'
                          : imagePayload.entityType === 'bean-purchases'
                            ? 'bean'
                            : null
                    if (cacheType) {
                      const cached = await getLocalEntityByServerId(
                        cacheType,
                        operation.entityServerId,
                      )
                      if (cached) {
                        await removeLocalEntity(
                          cacheType,
                          cached.localId,
                        ).catch(() => undefined)
                      }
                    }
                  }

                  const serverId = executionResult.serverId
                  if (!serverId) return

                  if (
                    operation.entityType === 'brew' &&
                    (operation.operationType === 'create' ||
                      operation.operationType === 'update')
                  ) {
                    await markBrewSynced(operation, serverId)
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
          if (result.stoppedByNetwork && navigator.onLine) scheduleRetry()
          else clearRetry()
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
      })()

      return syncInFlight
    }

    function scheduleRetry() {
      if (
        !shouldScheduleSyncRetry({
          online: navigator.onLine,
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

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
    const unsubscribe = subscribeToPendingSync(handleManualSync)

    if (navigator.onLine) void runSync()

    return () => {
      disposed = true
      if (activeSyncOwner === syncOwner) {
        activeSyncOwner = null
        usePendingBrewsStore.getState().setSyncing(false)
      }
      clearRetry()
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribe()
    }
  }, [router])

  return null
}
