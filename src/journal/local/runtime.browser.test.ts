// Runs with the browser platform (`bun run test:browser-runtime`): the real
// journal functions execute against an in-process PGlite journal.
import { afterEach, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { createBean, getBeanCollection, updateBean } from '@/journal/beans'
import { decodeInput } from '@/journal/codec'
import { getJournalFunction } from '@/journal/function'
import { currentScope, LocalJournal } from './client'
import { loadLocalMedia, localMediaObjectUrl } from './media'
import { migrateJournal } from './migrate'
import { replaceJournalRows } from './snapshot'

const migrations = Object.fromEntries(
  (await readdir('drizzle'))
    .filter((name) => name.endsWith('.sql'))
    .map((name) => [name, () => readFile(`drizzle/${name}`, 'utf8')]),
)

const opened: LocalJournal[] = []
afterEach(async () => {
  for (const journal of opened.splice(0)) await journal.close()
})

async function openJournal(sync: boolean) {
  const client = await PGlite.create('memory://')
  await migrateJournal(client, migrations)
  const journal = await openTestJournal(client, sync)
  opened.push(journal)
  return journal
}

let current: LocalJournal | undefined
async function openTestJournal(client: PGlite, sync: boolean) {
  const journal = await LocalJournal.open({
    database: 'roastbook-test',
    sync,
    identity: () => ({
      id: 'owner-a',
      email: '',
      role: 'user',
      authentication: false,
    }),
    bootstrap: async () => {},
    client: client as never,
  })
  current = journal
  return journal
}
// The runtime opens the edition journal; tests route it to the open journal.
const { mock } = await import('bun:test')
mock.module('@/journal/local/edition', () => ({
  openEditionJournal: async () => current,
}))

async function outbox(journal: LocalJournal) {
  return (
    await journal.client.query<{
      name: string
      input: unknown
      recorded: Record<string, unknown[]>
      status: string
    }>(
      'select name, input, recorded, status from roastbook_local.outbox order by seq',
    )
  ).rows
}

test('a synced write runs the shared SQL locally and records a replayable outbox entry', async () => {
  const journal = await openJournal(true)
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('beans', 501), ('bean_purchases', 701)",
  )
  const bean = await createBean({ data: { name: 'Local bean', weight: '250' } })
  expect(bean.id).toBe(501)
  const page = await getBeanCollection({ data: {} })
  expect(JSON.stringify(page)).toContain('Local bean')

  const [entry] = await outbox(journal)
  expect(entry?.name).toBe('beans/createBean')
  expect(entry?.status).toBe('pending')
  expect(entry?.recorded).toEqual({
    'id:beans': [501],
    'id:bean_purchases': [701],
  })
  expect(decodeInput(entry?.input)).toEqual({
    name: 'Local bean',
    weight: '250',
  })
})

test('offline creates stop with a readable error when reserved identifiers run out', async () => {
  const journal = await openJournal(true)
  await expect(
    createBean({ data: { name: 'No identifiers left' } }),
  ).rejects.toThrow('reserve more record identifiers')
  expect(await outbox(journal)).toEqual([])
  expect(JSON.stringify(await getBeanCollection({ data: {} }))).not.toContain(
    'No identifiers left',
  )
})

test('a rejected write changes neither the journal nor the outbox', async () => {
  const journal = await openJournal(true)
  await expect(
    updateBean({ data: { id: 999, name: 'Missing' } as never }),
  ).rejects.toThrow()
  expect(await outbox(journal)).toEqual([])
})

test('journals that never sync allocate identifiers locally and record no outbox', async () => {
  const journal = await openJournal(false)
  const first = await createBean({ data: { name: 'Demo one' } })
  const second = await createBean({ data: { name: 'Demo two' } })
  expect(second.id).toBeGreaterThan(first.id)
  expect(await outbox(journal)).toEqual([])
})

test('a refreshed journal reapplies pending writes with their recorded identifiers', async () => {
  const journal = await openJournal(true)
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('beans', 900), ('bean_purchases', 901)",
  )
  await createBean({ data: { name: 'Pending bean' } })
  // The server copy does not have the pending bean yet.
  await replaceJournalRows(journal, {
    beans: [
      {
        id: 10,
        name: 'From another device',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  })
  expect(JSON.stringify(await getBeanCollection({ data: {} }))).not.toContain(
    'Pending bean',
  )
  const [entry] = await outbox(journal)
  const write = getJournalFunction(entry?.name ?? '')
  if (!write || !entry) throw new Error('Expected the pending write')
  await journal.run(write, decodeInput(entry.input), {
    recorded: entry.recorded,
  })
  const page = JSON.stringify(await getBeanCollection({ data: {} }))
  expect(page).toContain('Pending bean')
  expect(page).toContain('From another device')
  const ids = await journal.client.query<{ id: number }>(
    "select id from beans where name = 'Pending bean'",
  )
  expect(ids.rows[0]?.id).toBe(900)
})

test('a sync requested offline never blocks the next one', async () => {
  const pushed: string[] = []
  mock.module('@/lib/server/journal-sync', () => ({
    pullJournal: async () => ({
      revision: 1,
      tables: null,
      account: null,
      config: {
        imageMaxPerItem: 3,
        imageStorageLimitMib: 0,
        storageProvider: 'local',
      },
    }),
    pushJournalWrite: async ({ data }: { data: { name: string } }) => {
      pushed.push(data.name)
      return { revision: 1, unchanged: true }
    },
    reserveJournalIds: async () => ({}),
  }))
  const { synchronizeJournal } = await import('./sync')
  const journal = await openJournal(true)
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('beans', 600), ('bean_purchases', 601)",
  )
  await createBean({ data: { name: 'Saved offline' } })
  const setOnline = (value: boolean) =>
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      get: () => value,
    })
  try {
    setOnline(false)
    await synchronizeJournal(journal)
    expect(pushed).toEqual([])
    setOnline(true)
    await synchronizeJournal(journal)
    expect(pushed).toEqual(['beans/createBean'])
    expect(await outbox(journal)).toEqual([])
  } finally {
    setOnline(true)
  }
})

test('concurrent calls each run in their own transaction', async () => {
  const journal = await openJournal(true)
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('beans', 700), ('bean_purchases', 701)",
  )
  let reading = true
  const read = getBeanCollection({ data: {} }).finally(() => {
    reading = false
  })
  while (reading && !currentScope()) await Promise.resolve()
  expect(currentScope()).toBeDefined()
  // Starts while the read's transaction is open.
  const [, created] = await Promise.all([
    read,
    createBean({ data: { name: 'Concurrent bean' } }),
  ])
  expect(created.id).toBe(700)
  expect((await outbox(journal)).map((entry) => entry.name)).toEqual([
    'beans/createBean',
  ])
})

test('pictures stored in this browser display after a reload', async () => {
  const journal = await openJournal(true)
  await journal.client.query(
    "insert into roastbook_local.media (path, mime_type, data) values ('beans/1/a.webp', 'image/webp', '\\x00'::bytea)",
  )
  expect(localMediaObjectUrl('beans/1/a.webp')).toBeUndefined()
  await loadLocalMedia(journal.client)
  expect(localMediaObjectUrl('beans/1/a.webp')).toStartWith('blob:')
})
