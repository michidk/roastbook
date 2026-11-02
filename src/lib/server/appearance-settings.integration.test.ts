import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { inArray } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { authUsers } from '@/db/schema'
import { loadAppSettings, updateSettings } from './settings.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const first: JournalIdentity = {
  id: randomUUID(),
  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
const second: JournalIdentity = {
  ...first,
  id: randomUUID(),
  email: `${randomUUID()}@example.test`,
}

suite('server appearance preferences', () => {
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values(
        [first, second].map((user) => ({
          id: user.id,
          email: user.email,
          emailVerified: true,
          journalInitializedAt: new Date(),
        })),
      )
  })
  afterAll(async () => {
    await getControlDb()
      .delete(authUsers)
      .where(inArray(authUsers.id, [first.id, second.id]))
  })
  test('persists each appearance setting across requests and isolates journals', async () => {
    const defaults = await withJournal(first, loadAppSettings)
    expect(defaults.lightTheme).toBe('light-roast')
    expect(defaults.darkTheme).toBe('dark-roast')
    expect(defaults.backgroundGrainEnabled).toBe(true)
    await withJournal(first, () =>
      updateSettings({ lightTheme: 'classic-light' }, 'save failed'),
    )
    await withJournal(first, () =>
      updateSettings({ darkTheme: 'pure-dark' }, 'save failed'),
    )
    await withJournal(first, () =>
      updateSettings(
        { backgroundGrainEnabled: false, backgroundTextureEnabled: false },
        'save failed',
      ),
    )
    const saved = await withJournal(first, loadAppSettings)
    expect(saved).toMatchObject({
      lightTheme: 'classic-light',
      darkTheme: 'pure-dark',
      backgroundGrainEnabled: false,
      backgroundTextureEnabled: false,
    })
    expect(await withJournal(second, loadAppSettings)).toMatchObject({
      lightTheme: 'light-roast',
      darkTheme: 'dark-roast',
      backgroundGrainEnabled: true,
      backgroundTextureEnabled: true,
    })
  })
})
