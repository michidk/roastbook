import { expect, test } from 'bun:test'

test.each([false, true])(
  'syncs pending device work before a paid edit, sync failure %s',
  (failSync) => {
    const result = Bun.spawnSync(
      [
        process.execPath,
        '-e',
        `
    import { mock } from 'bun:test'
    let pending = true
    const events = []
    mock.module('@/journal/local/device-copy', () => ({ keepsDeviceCopy: () => true, hasUnsyncedChanges: () => pending }))
    mock.module('@/journal/local/edition', () => ({ synchronizeEditionJournal: async () => {
      events.push('sync'); if (!${failSync}) pending = false
    } }))
    mock.module('@/journal/local/changes', () => ({ notifyLocalChange: async () => events.push('refresh') }))
    mock.module('@/lib/connection-status', () => ({ isConnectionOnline: () => true }))
    mock.module('@/lib/server/beautify-image', () => ({ prepareBeautifiedImage: async () => { events.push('provider'); return { id: 1 } } }))
    const { beautifyEntityImage } = await import('./src/lib/client/beautify-image')
    try { await beautifyEntityImage({ entityType: 'gear', entityId: 1, imageId: 1 }) }
    catch (error) { events.push(error.message) }
    console.log(JSON.stringify(events))
  `,
      ],
      { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' },
    )
    expect(result.exitCode).toBe(0)
    const events = JSON.parse(result.stdout.toString())
    if (failSync) {
      expect(events[0]).toBe('sync')
      expect(events[1]).toContain('Finish syncing')
      expect(events).not.toContain('provider')
    } else expect(events).toEqual(['sync', 'provider', 'sync', 'refresh'])
  },
)
