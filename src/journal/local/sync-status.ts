import { useSyncExternalStore } from 'react'

export type SyncStatus = {
  /** Changes saved in this browser and not yet confirmed by the server. */
  readonly pending: number
  /** Changes the server rejected; they wait for the user's review. */
  readonly conflicts: number
  readonly syncing: boolean
  /** Pages show the device copy while the startup sync is still running. */
  readonly updating: boolean
  readonly error: string | null
  readonly authRequired: boolean
  readonly lastSyncAt: string | null
}

let status: SyncStatus = {
  pending: 0,
  conflicts: 0,
  syncing: false,
  updating: false,
  error: null,
  authRequired: false,
  lastSyncAt: null,
}
const listeners = new Set<() => void>()

export function setSyncStatus(change: Partial<SyncStatus>) {
  status = { ...status, ...change }
  for (const listener of listeners) listener()
}

export const getSyncStatus = () => status

/** Resolves when a sync ends or after `budgetMs`; past that, pages show `updating` until it ends. */
export async function waitForSync(sync: Promise<unknown>, budgetMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const finished = await Promise.race([
    sync.then(() => true),
    new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), budgetMs)
    }),
  ])
  clearTimeout(timer)
  if (finished) return
  setSyncStatus({ updating: true })
  void sync.finally(() => setSyncStatus({ updating: false }))
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
