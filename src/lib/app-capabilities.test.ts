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

test('the compiled demo never opens synchronized storage or queues a local write', () => {
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
  expect(result.stdout.toString()).toEndWith('1\n')
})
