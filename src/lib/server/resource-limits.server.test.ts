import { describe, expect, test } from 'bun:test'
import {
  ResourceLimitError,
  ResourceLimiter,
} from '@/lib/server/resource-limits.server'

describe('ResourceLimiter', () => {
  test('limits requests within a window and resets afterward', async () => {
    let now = 1_000
    const limiter = new ResourceLimiter({
      windowMs: 100,
      maxRequestsPerWindow: 2,
      now: () => now,
    })

    await limiter.run('research', async () => 1)
    await limiter.run('research', async () => 2)
    await expect(limiter.run('research', async () => 3)).rejects.toBeInstanceOf(
      ResourceLimitError,
    )

    now += 100
    await expect(limiter.run('research', async () => 4)).resolves.toBe(4)
  })

  test('limits concurrent work and always releases the slot', async () => {
    let now = 1_000
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const limiter = new ResourceLimiter({
      windowMs: 100,
      maxConcurrentRequests: 1,
      now: () => now,
    })
    const first = limiter.run('vision', () => pending)

    now += 100
    await expect(limiter.run('vision', async () => undefined)).rejects.toThrow(
      'busy',
    )
    release()
    await first
    await expect(limiter.run('vision', async () => 'available')).resolves.toBe(
      'available',
    )
  })

  test('tracks operations independently', async () => {
    const limiter = new ResourceLimiter({ maxRequestsPerWindow: 1 })
    await limiter.run('vision', async () => undefined)
    await expect(limiter.run('research', async () => 'separate')).resolves.toBe(
      'separate',
    )
  })
})
