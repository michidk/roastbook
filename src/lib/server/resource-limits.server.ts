const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS_PER_WINDOW = 10
const DEFAULT_MAX_CONCURRENT_REQUESTS = 2

type LimitState = {
  startedAt: number
  requests: number
  active: number
}

export type ResourceLimiterOptions = {
  windowMs?: number
  maxRequestsPerWindow?: number
  maxConcurrentRequests?: number
  now?: () => number
}

export class ResourceLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResourceLimitError'
  }
}

export class ResourceLimiter {
  readonly #states = new Map<string, LimitState>()
  readonly #windowMs: number
  readonly #maxRequestsPerWindow: number
  readonly #maxConcurrentRequests: number
  readonly #now: () => number

  constructor({
    windowMs = DEFAULT_WINDOW_MS,
    maxRequestsPerWindow = DEFAULT_MAX_REQUESTS_PER_WINDOW,
    maxConcurrentRequests = DEFAULT_MAX_CONCURRENT_REQUESTS,
    now = Date.now,
  }: ResourceLimiterOptions = {}) {
    this.#windowMs = windowMs
    this.#maxRequestsPerWindow = maxRequestsPerWindow
    this.#maxConcurrentRequests = maxConcurrentRequests
    this.#now = now
  }

  async run<T>(operation: string, work: () => Promise<T>): Promise<T> {
    const now = this.#now()
    let state = this.#states.get(operation)
    if (!state) {
      state = { startedAt: now, requests: 0, active: 0 }
      this.#states.set(operation, state)
    } else if (now - state.startedAt >= this.#windowMs) {
      state.startedAt = now
      state.requests = 0
    }

    if (state.requests >= this.#maxRequestsPerWindow) {
      throw new ResourceLimitError('Too many requests. Try again in a minute.')
    }
    if (state.active >= this.#maxConcurrentRequests) {
      throw new ResourceLimitError('This service is busy. Try again shortly.')
    }

    state.requests += 1
    state.active += 1
    try {
      return await work()
    } finally {
      state.active -= 1
    }
  }
}

// Limits are intentionally per application process. Deployments with multiple
// replicas should also enforce a shared limit at the ingress or API gateway.
const processLimiter = new ResourceLimiter()

export async function withResourceLimits<T>(
  operation: string,
  work: () => Promise<T>,
): Promise<T> {
  return processLimiter.run(operation, work)
}
