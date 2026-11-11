import { expect, test } from 'bun:test'

function runScenario(scenario: string) {
  const result = Bun.spawnSync(
    [
      process.execPath,
      '-e',
      `
      import { mock } from 'bun:test'
      const events = []
      const notifications = []
      let pending = false
      let syncFails = false
      let syncError = null
      let refreshFails = false
      let online = true
      let provider = async () => ({ id: 1 })
      mock.module('sonner', () => ({ toast: Object.fromEntries(
        ['loading', 'success', 'error', 'info', 'warning'].map(kind => [kind, (message, options) => {
          notifications.push({ kind, message, ...options }); return 'edit-toast'
        }])
      ) }))
      mock.module('@/journal/local/device-copy', () => ({
        keepsDeviceCopy: () => true, hasUnsyncedChanges: () => pending,
      }))
      mock.module('@/journal/local/edition', () => ({ synchronizeEditionJournal: async () => {
        events.push('sync'); if (!syncFails) pending = false
        setSyncStatus({ error: syncError })
      } }))
      mock.module('@/journal/local/changes', () => ({ notifyLocalChange: async () => {
        events.push('refresh'); if (refreshFails) throw new Error('Refresh failed')
      } }))
      mock.module('@/lib/connection-status', () => ({ isConnectionOnline: () => online }))
      mock.module('@/lib/server/beautify-image', () => ({ prepareBeautifiedImage: async ({ data }) => {
        events.push('provider'); if (data.automatic) throw new Error('Unexpected automatic edit')
        return provider()
      } }))
      const { setSyncStatus } = await import('@/journal/local/sync-status')
      const { beautifyEntityImage } = await import('./src/lib/client/beautify-image')
      const selection = { entityType: 'gear', entityId: 1, imageId: 1 }
      ${scenario}
      console.log(JSON.stringify({ events, notifications }))
      `,
    ],
    { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' },
  )
  expect(result.exitCode).toBe(0)
  return JSON.parse(result.stdout.toString())
}

test.each([false, true])(
  'syncs pending device work before a paid edit, sync failure %s',
  (failSync) => {
    const { events, notifications } = runScenario(`
      pending = true; syncFails = ${failSync}
      await beautifyEntityImage(selection)
    `)
    if (failSync) {
      expect(events).toEqual(['sync'])
      expect(notifications.at(-1).kind).toBe('error')
      expect(notifications.at(-1).description).toContain('Finish syncing')
    } else {
      expect(events).toEqual(['sync', 'provider', 'sync', 'refresh'])
      expect(
        notifications.map((entry: { kind: string }) => entry.kind),
      ).toEqual(['loading', 'success'])
      expect(notifications.at(-1).id).toBe('edit-toast')
    }
  },
)

test('duplicate clicks start one request and one notification', () => {
  const { events, notifications } = runScenario(`
    let release
    provider = () => new Promise(resolve => { release = resolve })
    const first = beautifyEntityImage(selection)
    const duplicate = beautifyEntityImage(selection)
    release({ id: 1 })
    await Promise.all([first, duplicate])
  `)
  expect(events).toEqual(['provider', 'sync', 'refresh'])
  expect(notifications).toHaveLength(2)
  expect(notifications.at(-1).kind).toBe('success')
})

test('a provider failure updates the toast and permits retry', () => {
  const { events, notifications } = runScenario(`
    provider = async () => { throw new Error('Provider unavailable') }
    await beautifyEntityImage(selection)
    provider = async () => ({ id: 1 })
    await beautifyEntityImage(selection)
  `)
  expect(events).toEqual(['provider', 'provider', 'sync', 'refresh'])
  expect(notifications.map((entry: { kind: string }) => entry.kind)).toEqual([
    'loading',
    'error',
    'loading',
    'success',
  ])
  expect(notifications[1].id).toBe('edit-toast')
  expect(notifications[1].message).toContain('Your original is safe')
})

test('an already-edited result refreshes the gallery without claiming a new edit', () => {
  const { events, notifications } = runScenario(`
    provider = async () => null
    await beautifyEntityImage(selection)
  `)
  expect(events).toEqual(['provider', 'sync', 'refresh'])
  expect(notifications.at(-1).kind).toBe('info')
  expect(notifications.at(-1).message).toContain('already beautified')
})

test('a refresh failure after an edit reports the saved result', () => {
  const { events, notifications } = runScenario(`
    refreshFails = true
    await beautifyEntityImage(selection)
  `)
  expect(events).toEqual(['provider', 'sync', 'refresh'])
  expect(notifications.at(-1).kind).toBe('warning')
  expect(notifications.at(-1).description).toContain('saved on the server')
})

test('offline requests fail without contacting the provider', () => {
  const { events, notifications } = runScenario(`
    online = false
    await beautifyEntityImage(selection)
  `)
  expect(events).toEqual([])
  expect(notifications.at(-1).kind).toBe('error')
  expect(notifications.at(-1).description).toContain('Connect to the server')
})

test('a sync that resolves with a recorded failure reports the saved edit', () => {
  const { events, notifications } = runScenario(`
    syncError = 'Could not download the journal'
    await beautifyEntityImage(selection)
  `)
  expect(events).toEqual(['provider', 'sync'])
  expect(notifications.at(-1).kind).toBe('warning')
  expect(notifications.at(-1).description).toContain('saved on the server')
})

test('different pictures can be beautified while another request is pending', () => {
  const { events, notifications } = runScenario(`
    const releases = []
    provider = () => new Promise(resolve => releases.push(resolve))
    const first = beautifyEntityImage(selection)
    const second = beautifyEntityImage({ ...selection, imageId: 2 })
    for (const release of releases) release({ id: 1 })
    await Promise.all([first, second])
  `)
  expect(events.filter((event: string) => event === 'provider')).toHaveLength(2)
  expect(
    notifications.filter((entry: { kind: string }) => entry.kind === 'success'),
  ).toHaveLength(2)
})
