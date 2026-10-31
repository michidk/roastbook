const listeners = new Set<() => void>()
let reachable = true
let probe: Promise<void> | undefined
let stopMonitoring: (() => void) | undefined

export function isConnectionOnline(): boolean {
  return (
    typeof window === 'undefined' || (navigator.onLine !== false && reachable)
  )
}

function setReachable(value: boolean) {
  if (reachable === value) return
  reachable = value
  for (const listener of listeners) listener()
}

async function checkConnection(): Promise<void> {
  if (navigator.onLine === false) {
    setReachable(false)
    return
  }
  probe ??= fetch('/api/health', {
    cache: 'no-store',
    credentials: 'same-origin',
    signal: AbortSignal.timeout(5_000),
  })
    // An HTTP error still proves the server can be reached.
    .then(() => setReachable(true))
    .catch(() => setReachable(false))
    .finally(() => {
      probe = undefined
    })
  return probe
}

function monitorConnection(): () => void {
  const offline = () => setReachable(false)
  const refresh = () => {
    if (document.visibilityState === 'visible') void checkConnection()
  }
  window.addEventListener('offline', offline)
  window.addEventListener('online', refresh)
  window.addEventListener('pageshow', refresh)
  document.addEventListener('visibilitychange', refresh)
  const timer = window.setInterval(refresh, 15_000)
  refresh()
  return () => {
    window.removeEventListener('offline', offline)
    window.removeEventListener('online', refresh)
    window.removeEventListener('pageshow', refresh)
    document.removeEventListener('visibilitychange', refresh)
    window.clearInterval(timer)
  }
}

export function subscribeToConnection(listener: () => void): () => void {
  listeners.add(listener)
  stopMonitoring ??= monitorConnection()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      stopMonitoring?.()
      stopMonitoring = undefined
    }
  }
}

export async function fetchWithConnectionStatus(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (navigator.onLine === false) {
    setReachable(false)
    throw new TypeError('Failed to fetch Roastbook while offline')
  }

  const controller = new AbortController()
  const offline = () => controller.abort()
  window.addEventListener('offline', offline)
  const callerSignal =
    init?.signal ?? (input instanceof Request ? input.signal : undefined)
  const method =
    init?.method ?? (input instanceof Request ? input.method : 'GET')
  const signals = [controller.signal]
  if (callerSignal) signals.push(callerSignal)
  // Bound read requests so a lost mobile connection cannot leave loaders pending.
  if (method.toUpperCase() === 'GET') signals.push(AbortSignal.timeout(10_000))

  try {
    const response = await fetch(input, {
      ...init,
      signal: AbortSignal.any(signals),
    })
    setReachable(true)
    return response
  } catch (error) {
    if (callerSignal?.aborted) throw error
    if (
      error instanceof TypeError ||
      controller.signal.aborted ||
      (error instanceof DOMException && error.name === 'TimeoutError')
    ) {
      setReachable(false)
      throw new TypeError('Failed to fetch Roastbook', { cause: error })
    }
    throw error
  } finally {
    window.removeEventListener('offline', offline)
  }
}
