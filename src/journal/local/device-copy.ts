// Whether this browser keeps the journal locally. Kept apart from the local
// database so browsers without a copy never load it.
import { DEMO_MODE } from '@/lib/build-mode'
import { isStandalone } from '@/lib/standalone'

const choice = 'roastbook-device-copy'

/**
 * The demo and the installed app always keep the journal on the device, for
 * offline use. Browser tabs reuse an existing copy, including copies enabled
 * before the setting was removed; other tabs use the server.
 */
export function keepsDeviceCopy() {
  if (typeof window === 'undefined') return false
  if (DEMO_MODE || localStorage.getItem(choice) === 'on') return true
  if (!isStandalone()) return false
  // Once installed, the copy stays even when the journal opens in a tab.
  localStorage.setItem(choice, 'on')
  return true
}

export function setDeviceCopy(keep: boolean) {
  if (keep) localStorage.setItem(choice, 'on')
  else localStorage.removeItem(choice)
}

const unsynced = 'roastbook-unsynced-changes'

/**
 * Whether the copy holds changes the account does not have yet. Kept outside
 * the copy so pages can choose the server without opening it; until the copy
 * has been checked once, it may.
 */
export function hasUnsyncedChanges() {
  return localStorage.getItem(unsynced) !== 'no'
}

export function setUnsyncedChanges(value: boolean) {
  localStorage.setItem(unsynced, value ? 'yes' : 'no')
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
export async function keepsDeviceCopyFor(owner: string) {
  if (keepsDeviceCopy()) return true
  const databases = await indexedDB.databases?.().catch(() => [])
  const legacy = `rxdb-dexie-${legacyOfflineDatabase(owner)}--0--operations`
  if (!databases?.some((database) => database.name === legacy)) return false
  setDeviceCopy(true)
  return true
}
