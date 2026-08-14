import { describe, expect, test } from 'bun:test'
import { mediaCleanupRetryDelay } from '@/lib/server/media-lifecycle.server'

describe('mediaCleanupRetryDelay', () => {
  test('uses exponential backoff', () => {
    expect(mediaCleanupRetryDelay(1)).toBe(60_000)
    expect(mediaCleanupRetryDelay(2)).toBe(120_000)
    expect(mediaCleanupRetryDelay(3)).toBe(240_000)
  })

  test('caps retries at one day', () => {
    expect(mediaCleanupRetryDelay(1_000)).toBe(86_400_000)
  })
})
