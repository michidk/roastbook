type CacheEntry<Value> = {
  readonly expiresAt: number
  readonly value: Promise<Value>
}

type AsyncTtlCacheOptions<Input, Value> = {
  readonly load: (input: Input) => Promise<Value>
  readonly key: (input: Input) => string
  readonly ttlMs: number
  readonly maxEntries: number
  readonly now?: () => number
}

/**
 * Small process-local cache for expensive, read-only statistics queries.
 * Promises are cached so identical concurrent requests share the same work.
 */
export function createAsyncTtlCache<Input, Value>({
  load,
  key,
  ttlMs,
  maxEntries,
  now = Date.now,
}: AsyncTtlCacheOptions<Input, Value>): (input: Input) => Promise<Value> {
  const entries = new Map<string, CacheEntry<Value>>()

  return (input) => {
    const cacheKey = key(input)
    const current = entries.get(cacheKey)
    if (current && current.expiresAt > now()) {
      entries.delete(cacheKey)
      entries.set(cacheKey, current)
      return current.value
    }
    if (current) entries.delete(cacheKey)

    const value = load(input)
    const entry = { expiresAt: now() + ttlMs, value }
    entries.set(cacheKey, entry)

    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value
      if (oldestKey === undefined) break
      entries.delete(oldestKey)
    }

    void value.catch(() => {
      if (entries.get(cacheKey) === entry) entries.delete(cacheKey)
    })
    return value
  }
}
