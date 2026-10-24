import { create } from 'zustand'
import { getErrorMessage } from '@/lib/error-message'
import {
  getLocalEntity,
  putLocalEntity,
  removeLocalEntity,
} from '@/modules/offline/local-data'
import {
  deletePendingBrew,
  listPendingBrews,
  putPendingBrew,
  updatePendingBrew,
} from '@/modules/offline/queue'
import { requestPendingSync } from '@/modules/offline/sync-trigger'
import type { PendingBrew, PendingBrewPayload } from '@/modules/offline/types'

type PendingBrewsState = {
  readonly items: PendingBrew[]
  readonly isHydrated: boolean
  readonly isSyncing: boolean
  readonly loadError: string | null
  readonly hydrate: () => Promise<void>
  readonly refresh: () => Promise<void>
  readonly setSyncing: (isSyncing: boolean) => void
}

export const usePendingBrewsStore = create<PendingBrewsState>((set) => ({
  items: [],
  isHydrated: false,
  isSyncing: false,
  loadError: null,
  hydrate: async () => {
    try {
      const items = await listPendingBrews()
      set({ items, isHydrated: true, loadError: null })
    } catch (error) {
      set({
        isHydrated: true,
        loadError: getErrorMessage(error, 'Could not read pending brews'),
      })
    }
  },
  refresh: async () => {
    try {
      const items = await listPendingBrews()
      set({ items, isHydrated: true, loadError: null })
    } catch (error) {
      set({
        isHydrated: true,
        loadError: getErrorMessage(error, 'Could not read pending brews'),
      })
    }
  },
  setSyncing: (isSyncing) => set({ isSyncing }),
}))

export async function enqueuePendingBrew(item: PendingBrew): Promise<void> {
  await putPendingBrew(item)
  await putLocalEntity({
    entityType: 'brew',
    localId: item.operationId,
    data: item.payload,
    syncState: 'pending',
    updatedAt: item.createdAt,
  }).catch(() => undefined)
  await usePendingBrewsStore.getState().refresh()
  requestPendingSync()
}

export async function updateQueuedBrewPayload(
  operationId: string,
  payload: PendingBrewPayload,
): Promise<void> {
  await updatePendingBrew(operationId, { payload })
  const localEntity = await getLocalEntity('brew', operationId).catch(
    () => undefined,
  )
  if (localEntity) {
    await putLocalEntity({
      ...localEntity,
      data: payload,
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined)
  }
  await usePendingBrewsStore.getState().refresh()
}

export async function discardPendingBrew(operationId: string): Promise<void> {
  if (usePendingBrewsStore.getState().isSyncing) {
    throw new Error(
      'Wait for the current sync to finish before discarding this brew',
    )
  }
  await deletePendingBrew(operationId)
  await removeLocalEntity('brew', operationId).catch(() => undefined)
  await usePendingBrewsStore.getState().refresh()
}

export async function retryPendingBrew(operationId: string): Promise<void> {
  await updatePendingBrew(operationId, {
    status: 'pending',
    lastError: undefined,
  })
  await usePendingBrewsStore.getState().refresh()
  requestPendingSync()
}
