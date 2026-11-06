import { useSyncExternalStore } from 'react'

export type SyncStatus = {
  /** Changes saved in this browser and not yet confirmed by the server. */
  readonly pending: number
  /** Changes the server rejected; they wait for the user's review. */
  readonly conflicts: number
  readonly syncing: boolean
  readonly error: string | null
  readonly authRequired: boolean
  readonly lastSyncAt: string | null
}

let status: SyncStatus = {
  pending: 0,
  conflicts: 0,
  syncing: false,
  error: null,
  authRequired: false,
  lastSyncAt: null,
}
const listeners = new Set<() => void>()

export function setSyncStatus(change: Partial<SyncStatus>) {
  status = { ...status, ...change }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSyncStatus() {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => status,
  )
}
