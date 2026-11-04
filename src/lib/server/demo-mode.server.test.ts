import { describe, expect, test } from 'bun:test'
import { DEMO_MODE_READ_ONLY_MESSAGE } from '@/lib/build-mode'
import {
  demoModeReadOnlyResponse,
  isDemoModeWriteRequest,
  isDemoServerRequestBlocked,
} from '@/lib/server/demo-mode.server'

describe('demo mode mutation guard', () => {
  test('blocks integration, replication, and server-function reads as well as writes', () => {
    for (const path of [
      '/api/mcp',
      '/api/account/exports/test',
      '/api/replication/pull',
      '/api/shottimer/target',
      '/api/auth/sign-in',
      '/_serverFn/test',
    ]) {
      expect(isDemoServerRequestBlocked(true, 'GET', path)).toBe(true)
      expect(isDemoServerRequestBlocked(true, 'POST', path)).toBe(true)
      expect(isDemoServerRequestBlocked(false, 'GET', path)).toBe(false)
    }
    expect(isDemoServerRequestBlocked(true, 'GET', '/api/health')).toBe(false)
    expect(isDemoServerRequestBlocked(true, 'GET', '/beans')).toBe(false)
    expect(isDemoServerRequestBlocked(true, 'POST', '/beans')).toBe(true)
  })
  test('allows mutations when demo mode is disabled', () => {
    expect(isDemoModeWriteRequest(false, 'POST')).toBe(false)
  })

  test('blocks mutations when demo mode is enabled', () => {
    expect(isDemoModeWriteRequest(true, 'POST')).toBe(true)
    expect(isDemoModeWriteRequest(true, 'GET')).toBe(false)
    expect(isDemoModeWriteRequest(true, 'HEAD')).toBe(false)
  })

  test('returns a forbidden response for blocked requests', async () => {
    const response = demoModeReadOnlyResponse()

    expect(response.status).toBe(403)
    expect(response.headers.get('content-type')).toStartWith('text/plain')
    expect(await response.text()).toBe(DEMO_MODE_READ_ONLY_MESSAGE)
  })
})
