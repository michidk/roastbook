// Whether this browser keeps the journal locally. Kept apart from the local
// database so browsers without a copy never load it.
import { DEMO_MODE } from '@/lib/build-mode'
import { isStandalone } from '@/lib/standalone'

const choice = 'roastbook-device-copy'

/**
 * The demo and the installed app read and write the journal on the device, for
 * offline use. Browser tabs always use the server, even in a browser whose
 * installed app keeps a copy.
 */
export function keepsDeviceCopy() {
  if (typeof window === 'undefined') return false
  if (DEMO_MODE) return true
  if (!isStandalone()) return false
  localStorage.setItem(choice, 'on')
  return true
}

/**
 * Whether this browser holds a copy: from the installed app, the former
 * offline setting, or tabs before they used the server. Tabs still sync it, so
 * its pending changes reach the account, and remove it on sign-out.
 */
export function hasDeviceCopy() {
  return keepsDeviceCopy() || localStorage.getItem(choice) === 'on'
}

export function setDeviceCopy(keep: boolean) {
  if (keep) localStorage.setItem(choice, 'on')
  else localStorage.removeItem(choice)
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
