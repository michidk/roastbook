import { describe, expect, test } from 'bun:test'
import { createAsyncTtlCache } from '@/lib/server/stats-cache'

describe('statistics cache', () => {
  test('reuses a result until it expires', async () => {
    let now = 1_000
    let loads = 0
    const cached = createAsyncTtlCache({
      load: async (key: string) => `${key}-${++loads}`,
      key: (key) => key,
      ttlMs: 100,
      maxEntries: 4,
      now: () => now,
    })

    expect(await cached('stats')).toBe('stats-1')
    expect(await cached('stats')).toBe('stats-1')
    now += 100
    expect(await cached('stats')).toBe('stats-2')
  })

  test('keeps different filters separate', async () => {
    let loads = 0
    const cached = createAsyncTtlCache({
      load: async (key: string) => `${key}-${++loads}`,
      key: (key) => key,
      ttlMs: 100,
      maxEntries: 4,
    })

    expect(await cached('30d')).toBe('30d-1')
    expect(await cached('90d')).toBe('90d-2')
  })

  test('deduplicates concurrent requests', async () => {
    let resolveLoad: ((value: number) => void) | undefined
    let loads = 0
    const cached = createAsyncTtlCache({
      load: () => {
        loads += 1
        return new Promise<number>((resolve) => {
          resolveLoad = resolve
        })
      },
      key: () => 'stats',
      ttlMs: 100,
      maxEntries: 4,
    })

    const first = cached(undefined)
    const second = cached(undefined)
    expect(first).toBe(second)
    expect(loads).toBe(1)
    resolveLoad?.(42)
    expect(await first).toBe(42)
  })

  test('evicts rejected loads', async () => {
    let loads = 0
    const cached = createAsyncTtlCache({
      load: async () => {
        loads += 1
        if (loads === 1) throw new Error('temporary failure')
        return 'recovered'
      },
      key: () => 'stats',
      ttlMs: 100,
      maxEntries: 4,
    })

    await expect(cached(undefined)).rejects.toThrow('temporary failure')
    expect(await cached(undefined)).toBe('recovered')
  })
})
