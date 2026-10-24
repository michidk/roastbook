const listeners = new Set<() => void>()
const finishedListeners = new Set<() => void>()

export function requestPendingSync(): void {
  for (const listener of listeners) listener()
}

export function subscribeToPendingSync(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyPendingSyncFinished(): void {
  for (const listener of finishedListeners) listener()
}

export function subscribeToPendingSyncFinished(
  listener: () => void,
): () => void {
  finishedListeners.add(listener)
  return () => finishedListeners.delete(listener)
}
