import { describe, expect, test } from 'bun:test'
import { featureAvailability } from './app-capabilities'

describe('application capabilities', () => {
  test('demo permits local journal edits and blocks integrations and standard offline synchronization', () => {
    for (const feature of [
      'install',
      'offline',
      'server-write',
      'ai',
    ] as const) {
      expect(
        featureAvailability(feature, {
          demo: true,
          online: true,
          configured: true,
        }).available,
      ).toBe(false)
    }
    expect(
      featureAvailability('journal-write', { demo: true, online: false }),
    ).toEqual({ available: true })
    expect(featureAvailability('install', { demo: true })).toMatchObject({
      reason: expect.stringContaining('not available in the demo'),
    })
  })

  test('journaling stays available offline while server-only features explain why they are blocked', () => {
    expect(
      featureAvailability('journal-write', { demo: false, online: false }),
    ).toEqual({ available: true })
    expect(
      featureAvailability('offline', { demo: false, online: false }),
    ).toEqual({ available: true })
    expect(
      featureAvailability('ai', { demo: false, online: false }).available,
    ).toBe(false)
    expect(
      featureAvailability('server-write', { demo: false, online: false })
        .available,
    ).toBe(false)
    expect(
      featureAvailability('ai', {
        demo: false,
        online: true,
        configured: false,
      }).available,
    ).toBe(false)
  })
})
