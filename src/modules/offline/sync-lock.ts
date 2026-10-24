export const OFFLINE_SYNC_LOCK_NAME = 'roastbook-offline-sync'

interface SyncLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>
}

function browserLockManager(): SyncLockManager | undefined {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    return undefined
  }
  return navigator.locks as SyncLockManager
}

/**
 * Serializes flushes across tabs. Browsers without Web Locks fall back to the
 * in-tab single-flight guard.
 */
export function withOfflineSyncLock<T>(
  run: () => Promise<T>,
  locks: SyncLockManager | null | undefined = browserLockManager(),
): Promise<T> {
  return locks ? locks.request(OFFLINE_SYNC_LOCK_NAME, run) : run()
}
