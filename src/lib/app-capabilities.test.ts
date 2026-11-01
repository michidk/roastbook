import { describe, expect, test } from 'bun:test'
import { featureAvailability } from './app-capabilities'

describe('application capabilities', () => {
  test('demo blocks installation, offline storage, and every server action even while online', () => {
    for (const feature of [
      'install',
      'offline',
      'journal-write',
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

test('the compiled demo cannot open local storage or queue a write through a direct call', () => {
  const result = Bun.spawnSync(
    [
      process.execPath,
      '--define',
      '__ROASTBOOK_DEMO_MODE__=true',
      '-e',
      `
    const { getOfflineRxDatabase } = await import('./src/modules/rxdb/offline-database')
    const { runJournalMutation } = await import('./src/modules/offline/mutation')
    const { loadCached } = await import('./src/modules/offline/cached-read')
    let calls = 0
    try { await getOfflineRxDatabase() } catch (error) { console.log(error.message) }
    try { await runJournalMutation({ online: () => false, send: async () => ++calls, enqueue: async () => String(++calls) }) } catch (error) { console.log(error.message) }
    await loadCached({ load: async () => ({ name: 'Demo' }), read: async () => { calls++; return undefined }, write: async () => { calls++ } })
    console.log(calls)
  `,
    ],
    { cwd: process.cwd() },
  )
  expect(result.exitCode).toBe(0)
  expect(result.stderr.toString()).toBe('')
  expect(result.stdout.toString()).toContain(
    'Offline support is not available in the demo.',
  )
  expect(result.stdout.toString()).toEndWith('0\n')
})
