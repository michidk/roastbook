const OWNER_KEY = 'roastbook-active-owner'
let owner: string | undefined
const cleanups = new Set<() => Promise<void>>()
let watching = false

function storedOwner() {
  try {
    return window.localStorage.getItem(OWNER_KEY) ?? 'local'
  } catch {
    return 'local'
  }
}

export function getOfflineOwner() {
  if (typeof window === 'undefined') return 'local'
  owner ??= storedOwner()
  return owner
}

export function registerOwnerCleanup(cleanup: () => Promise<void>) {
  cleanups.add(cleanup)
}

export function restoreOfflineOwner(id: string) {
  if (typeof window === 'undefined') return
  if (watching && owner === id) return
  owner = id
  try {
    window.localStorage.setItem(OWNER_KEY, id)
  } catch {
    // The in-memory identity still isolates storage when localStorage is unavailable.
  }
  if (!watching) {
    watching = true
    window.addEventListener('storage', (event) => {
      if (event.key !== OWNER_KEY || event.newValue === owner) return
      // Cookies are shared between tabs. Stop exposing the previous account's UI
      // and reload before this tab can start work under a different identity.
      document.documentElement.style.visibility = 'hidden'
      window.location.reload()
    })
  }
}

export async function selectOfflineOwner(id: string) {
  if (typeof window === 'undefined') return
  if (getOfflineOwner() !== id) {
    for (const cleanup of cleanups) await cleanup()
  }
  restoreOfflineOwner(id)
}

export function offlineDatabaseName() {
  const id = getOfflineOwner()
  return id === 'local'
    ? 'roastbook-offline-rxdb'
    : `roastbook-user-${Array.from(id)
        .map((c) => c.codePointAt(0)?.toString(16))
        .join('_')}`
}
