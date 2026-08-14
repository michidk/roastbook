const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 10
const MAX_CONCURRENT_REQUESTS = 2

type LimitState = {
  startedAt: number
  requests: number
  active: number
}

const states = new Map<string, LimitState>()

export class ResourceLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResourceLimitError'
  }
}

export async function withResourceLimits<T>(
  operation: string,
  work: () => Promise<T>,
): Promise<T> {
  const now = Date.now()
  const current = states.get(operation)
  const state =
    !current || now - current.startedAt >= WINDOW_MS
      ? { startedAt: now, requests: 0, active: current?.active ?? 0 }
      : current

  if (state.requests >= MAX_REQUESTS_PER_WINDOW) {
    throw new ResourceLimitError('Too many requests. Try again in a minute.')
  }
  if (state.active >= MAX_CONCURRENT_REQUESTS) {
    throw new ResourceLimitError('This service is busy. Try again shortly.')
  }

  state.requests += 1
  state.active += 1
  states.set(operation, state)

  try {
    return await work()
  } finally {
    state.active -= 1
  }
}
