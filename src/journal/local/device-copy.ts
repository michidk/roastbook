// Whether this browser keeps the journal locally. Kept apart from the local
// database so browsers without a copy never load it.
import { DEMO_MODE } from '@/lib/build-mode'
import { isStandalone } from '@/lib/standalone'

const choice = 'roastbook-device-copy'

/**
 * The demo and the installed app keep the journal on the device, for offline
 * use. Browser tabs create no copy.
 */
export function keepsDeviceCopy() {
  if (typeof window === 'undefined') return false
  if (DEMO_MODE) return true
  if (!isStandalone()) return false
  localStorage.setItem(choice, 'on')
  return true
}

/**
 * Whether this browser holds a copy, from the installed app or the former
 * offline setting. Every tab of the browser syncs it, reads it offline and
 * removes it on sign-out.
 */
export function hasDeviceCopy() {
  return keepsDeviceCopy() || localStorage.getItem(choice) === 'on'
}

export function setDeviceCopy(keep: boolean) {
  if (keep) localStorage.setItem(choice, 'on')
  else localStorage.removeItem(choice)
}

const unsynced = 'roastbook-unsynced-changes'

/**
 * Whether the copy holds changes the account does not have yet. Kept outside
 * the copy so pages can choose the server without opening it.
 */
export function hasUnsyncedChanges() {
  return localStorage.getItem(unsynced) === 'yes'
}

export function setUnsyncedChanges(value: boolean) {
  if (value) localStorage.setItem(unsynced, 'yes')
  else localStorage.removeItem(unsynced)
}

/** Where the earlier offline mode (RxDB) kept an owner's queued changes. */
export function legacyOfflineDatabase(owner: string) {
  return owner === 'local'
    ? 'roastbook-offline-rxdb'
    : `roastbook-user-${Array.from(owner)
        .map((character) => character.codePointAt(0)?.toString(16))
        .join('_')}`
}

/**
 * Changes queued by the earlier offline mode move through a device copy, so a
 * browser that still holds some keeps one.
 */
export async function hasDeviceCopyFor(owner: string) {
  if (hasDeviceCopy()) return true
  const databases = await indexedDB.databases?.().catch(() => [])
  const legacy = `rxdb-dexie-${legacyOfflineDatabase(owner)}--0--operations`
  if (!databases?.some((database) => database.name === legacy)) return false
  setDeviceCopy(true)
  return true
}
