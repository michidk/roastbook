// Journal change notifications. Kept apart from the local database so pages in
// a browser without a device copy never load it.

/** `write`: a change saved in a tab; `download`: changes made elsewhere. */
export type LocalChange = 'write' | 'download'
type LocalChangeListener = (change: LocalChange) => unknown
const listeners = new Set<LocalChangeListener>()
/**
 * Notified after every journal write, in this tab and others, and after
 * downloads. A write in this tab resolves once its listeners have.
 */
export function subscribeLocalChanges(listener: LocalChangeListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let beforeOtherTabChange: (() => Promise<unknown>) | undefined
/** Runs before pages refresh for another tab's change, e.g. to load its pictures. */
export function prepareOtherTabChanges(prepare: () => Promise<unknown>) {
  beforeOtherTabChange = prepare
}

// Browser only: an open channel would keep a server-rendering process alive.
const channel =
  typeof window === 'undefined' || typeof BroadcastChannel === 'undefined'
    ? undefined
    : new BroadcastChannel('roastbook-local-journal')
channel?.addEventListener('message', async ({ data }) => {
  await beforeOtherTabChange?.().catch(() => undefined)
  for (const listener of listeners)
    listener(data === 'download' ? 'download' : 'write')
})

export async function notifyLocalChange(change: LocalChange) {
  channel?.postMessage(change)
  await Promise.allSettled(
    [...listeners].map(async (listener) => listener(change)),
  )
}
