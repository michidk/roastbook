// Runs with the browser platform (`bun run test:browser-runtime`): the real
// journal functions execute against an in-process PGlite journal.
import { afterEach, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import {
  createBean,
  deleteBean,
  getBean,
  getBeanCollection,
  updateBean,
} from '@/journal/beans'
import { decodeInput, rejectedPrefix } from '@/journal/codec'
import { getJournalFunction } from '@/journal/function'
import responseSchemas from '@/lib/server/integrations/response-schemas.gen.json'
import { currentScope, LocalJournal } from './client'
import { loadLocalMedia, localMediaObjectUrl } from './media'
import { migrateJournal } from './migrate'
import { applyJournalChanges, replaceJournalRows } from './snapshot'

const migrations = Object.fromEntries(
  (await readdir('drizzle'))
    .filter((name) => name.endsWith('.sql'))
    .map((name) => [name, () => readFile(`drizzle/${name}`, 'utf8')]),
)

// The first test also migrates the template database.
setDefaultTimeout(30_000)

const opened: LocalJournal[] = []
afterEach(async () => {
  for (const journal of opened.splice(0)) await journal.close()
})

// Migrated once; each test starts from a copy of that database.
let migrated: Blob | undefined
async function migratedClient() {
  if (!migrated) {
    const template = await PGlite.create('memory://')
    await migrateJournal(template, migrations)
    migrated = await template.dumpDataDir('none')
    await template.close()
  }
  return PGlite.create('memory://', { loadDataDir: migrated })
}

async function openJournal(sync: boolean) {
  const client = await migratedClient()
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
mock.module('@/journal/local/edition', () => ({
  openEditionJournal: async () => current,
}))
// These tests keep a device copy unless one says otherwise. Its changes have
// not synced, so functions run on it even online.
let deviceCopy = true
let unsynced = true
mock.module('@/journal/local/device-copy', () => ({
  hasDeviceCopy: () => deviceCopy,
  hasUnsyncedChanges: () => unsynced,
  setUnsyncedChanges: () => {},
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
  // Identifiers and the time of the write replay exactly on the server.
  expect(entry?.recorded).toEqual({
    'id:beans': [501],
    'id:bean_purchases': [701],
    now: [expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)],
  })
  const [row] = (
    await journal.client.query<{ created_at: Date }>(
      'select created_at from beans where id = 501',
    )
  ).rows
  expect(row?.created_at.toISOString()).toBe(
    (entry?.recorded.now?.[0] as string) ?? '',
  )
  expect(decodeInput(entry?.input)).toEqual({
    name: 'Local bean',
    weight: '250',
  })
})

test('published response schemas accept real journal results after JSON serialization', async () => {
  const journal = await openJournal(true)
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('beans', 501), ('bean_purchases', 701)",
  )
  const ajv = new Ajv2020({ strict: false, allowUnionTypes: true })
  addFormats(ajv)
  function validate(
    name: keyof typeof responseSchemas.operations,
    value: unknown,
  ) {
    const accepts = ajv.compile({
      ...responseSchemas.operations[name],
      components: { schemas: responseSchemas.definitions },
    })
    expect(
      accepts(JSON.parse(JSON.stringify(value ?? null))),
      JSON.stringify(accepts.errors),
    ).toBe(true)
  }
  const bean = await createBean({ data: { name: 'API bean', weight: '250' } })
  validate('create_bean', bean)
  validate('get_bean', await getBean({ data: bean.id }))
  validate('list_beans', await getBeanCollection({ data: {} }))
  validate(
    'update_bean',
    await updateBean({ data: { id: bean.id, name: 'Updated API bean' } }),
  )
  validate('delete_bean', await deleteBean({ data: bean.id }))
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
    replay: { recorded: entry.recorded },
  })
  const page = JSON.stringify(await getBeanCollection({ data: {} }))
  expect(page).toContain('Pending bean')
  expect(page).toContain('From another device')
  const ids = await journal.client.query<{ id: number }>(
    "select id from beans where name = 'Pending bean'",
  )
  expect(ids.rows[0]?.id).toBe(900)
})

// Without a window the reachability probe never runs; the browser flag decides.
mock.module('@/lib/connection-status', () => ({
  isConnectionOnline: () => navigator.onLine,
}))

// Sync runs only online; tests that need offline override this.
const setOnline = (value: boolean) =>
  Object.defineProperty(globalThis.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  })
setOnline(true)

const pushed: string[] = []
let push = async (_name: string) => ({ revision: 1, unchanged: true })
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
    return push(data.name)
  },
  reserveJournalIds: async () => ({}),
  callJournal: async ({ data }: { data: { name: string; input: unknown } }) => {
    called.push(data)
    return callServer()
  },
}))
const called: Array<{ name: string; input: unknown }> = []
let callServer = async (): Promise<unknown> => ({ id: 42 })
const sync = await import('./sync')

async function pendingBeans(journal: LocalJournal, names: string[]) {
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) select 'beans', g from generate_series(600, 610) g union all select 'bean_purchases', g from generate_series(600, 610) g",
  )
  for (const name of names) await createBean({ data: { name } })
  pushed.length = 0
}

test('a sync requested offline never blocks the next one', async () => {
  const journal = await openJournal(true)
  await pendingBeans(journal, ['Saved offline'])
  try {
    setOnline(false)
    await sync.synchronizeJournal(journal)
    expect(pushed).toEqual([])
    setOnline(true)
    await sync.synchronizeJournal(journal)
    expect(pushed).toEqual(['beans/createBean'])
    expect(await outbox(journal)).toEqual([])
  } finally {
    setOnline(true)
  }
})

test('a later change never overtakes one waiting to retry', async () => {
  const journal = await openJournal(true)
  await pendingBeans(journal, ['First', 'Second'])
  await journal.client.query(
    "update roastbook_local.outbox set next_attempt_at = now() + interval '1 minute' where seq = (select min(seq) from roastbook_local.outbox)",
  )
  await sync.synchronizeJournal(journal)
  expect(pushed).toEqual([])
  expect(await outbox(journal)).toHaveLength(2)
})

test('rejected changes wait for review; failures retry in order', async () => {
  const journal = await openJournal(true)
  await pendingBeans(journal, ['Rejected', 'Retried'])
  let calls = 0
  push = async () => {
    calls += 1
    if (calls === 1) throw new Error(`${rejectedPrefix}Bean not found`)
    throw new Error('Your journal is busy. Try again shortly.')
  }
  try {
    await sync.synchronizeJournal(journal)
  } finally {
    push = async () => ({ revision: 1, unchanged: true })
  }
  const rows = await journal.client.query<{
    status: string
    error: string
    attempts: number
  }>('select status, error, attempts from roastbook_local.outbox order by seq')
  expect(rows.rows).toEqual([
    { status: 'conflict', error: 'Bean not found', attempts: 0 },
    {
      status: 'pending',
      error: 'Your journal is busy. Try again shortly.',
      attempts: 1,
    },
  ])
  // Retrying a reviewed change downloads the journal after it applies.
  const [conflict] = await sync.listPendingChanges(journal)
  await journal.setState('revision', 1)
  await journal.client.query(
    'update roastbook_local.outbox set next_attempt_at = now()',
  )
  await sync.retryChange(journal, conflict?.seq ?? 0)
  expect(await outbox(journal)).toEqual([])
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

/** The smallest IndexedDB that the earlier-storage reader needs. */
function legacyIndexedDB(stores: Record<string, unknown[]>) {
  const request = <T>(result: T) => {
    const pending = {
      result,
      onsuccess: null as null | (() => void),
      onerror: null,
    }
    queueMicrotask(() => pending.onsuccess?.())
    return pending
  }
  return {
    databases: async () => Object.keys(stores).map((name) => ({ name })),
    open: (name: string) =>
      request({
        objectStoreNames: { contains: () => true },
        close: () => undefined,
        transaction: () => ({
          objectStore: () => ({ getAll: () => request(stores[name] ?? []) }),
        }),
      }),
    deleteDatabase: (name: string) => {
      delete stores[name]
    },
  }
}

test('earlier offline changes move once, keeping their operation ids', async () => {
  const { migrateLegacyOffline } = await import('./legacy-offline')
  const journal = await openJournal(true)
  const method = await journal.client.query<{ id: number }>(
    "insert into brewing_methods (owner_id, name) values ('owner-a', 'Espresso') returning id",
  )
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('brews', 800)",
  )
  const operationId = crypto.randomUUID()
  const sentId = crypto.randomUUID()
  const database = `roastbook-user-${Array.from('owner-a')
    .map((character) => character.codePointAt(0)?.toString(16))
    .join('_')}`
  const stores: Record<string, unknown[]> = {
    [`rxdb-dexie-${database}--0--operations`]: [
      {
        id: operationId,
        entityType: 'brew',
        operationType: 'create',
        entityLocalId: 'local-1',
        entityServerId: null,
        payload: {
          brewingMethodId: method.rows[0]?.id,
          doseGrams: '18',
          clientOperationId: sentId,
        },
        dependencyIds: [],
        createdAt: '2026-11-01T08:00:00.000Z',
        status: 'pending',
        baseRevision: null,
        blobKeys: [],
      },
    ],
    [`rxdb-dexie-${database}--0--blobs`]: [],
  }
  const original = globalThis.indexedDB
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: legacyIndexedDB(stores),
  })
  try {
    const keys = () =>
      journal.client
        .query<{ key: string }>('select key from roastbook_local.outbox')
        .then((result) => result.rows.map((row) => row.key))
    const saved = { ...stores }
    expect(await migrateLegacyOffline(journal)).toBe(0)
    expect(await keys()).toEqual([sentId])
    expect(Object.keys(stores)).toEqual([])
    // Interrupted before the old stores were removed: moving again is safe.
    Object.assign(stores, saved)
    expect(await migrateLegacyOffline(journal)).toBe(0)
    expect(await keys()).toEqual([sentId])
    const brews = await journal.client.query<{ id: number }>(
      'select id from brews',
    )
    expect(brews.rows.map((row) => row.id)).toEqual([800])
  } finally {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: original,
    })
  }
})

test('a browser without a device copy runs journal functions on the server', async () => {
  deviceCopy = false
  const { subscribeLocalChanges } = await import('./changes')
  const changes: string[] = []
  const unsubscribe = subscribeLocalChanges((change) => {
    changes.push(change)
  })
  try {
    const bean = await createBean({ data: { name: 'Server bean' } })
    expect(bean).toEqual({ id: 42 } as never)
    expect(called).toEqual([
      { name: 'beans/createBean', input: { name: 'Server bean' } },
    ])
    // Pages refresh after a server write too.
    expect(changes).toEqual(['write'])
  } finally {
    unsubscribe()
    deviceCopy = true
  }
})

test('online, a synced device copy leaves functions to the server', async () => {
  await openJournal(true)
  unsynced = false
  called.length = 0
  try {
    expect(await getBean({ data: 1 })).toEqual({ id: 42 } as never)
    expect(called.map((call) => call.name)).toEqual(['beans/getBean'])
  } finally {
    unsynced = true
  }
})

test('a read the server cannot answer comes from the device copy; a write fails', async () => {
  const journal = await openJournal(true)
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('beans', 520), ('bean_purchases', 720)",
  )
  await createBean({ data: { name: 'Kept on device' } })
  unsynced = false
  callServer = async () => {
    // The connection drops while the request is under way.
    setOnline(false)
    throw new TypeError('Failed to fetch Roastbook')
  }
  try {
    const page = JSON.stringify(await getBeanCollection({ data: {} }))
    expect(page).toContain('Kept on device')
    setOnline(true)
    // The server may have applied it, so it is not recorded again locally.
    await expect(createBean({ data: { name: 'Lost' } })).rejects.toThrow(
      'Failed to fetch',
    )
    expect(await outbox(journal)).toHaveLength(1)
  } finally {
    setOnline(true)
    unsynced = true
    callServer = async () => ({ id: 42 })
  }
})

test('a download applies only what changed: replaced rows and deletions', async () => {
  const journal = await openJournal(true)
  const at = new Date('2026-11-01T08:00:00.000Z')
  await replaceJournalRows(journal, {
    beans: [
      { id: 1, name: 'Kept', createdAt: at, updatedAt: at },
      { id: 2, name: 'Old name', createdAt: at, updatedAt: at },
      { id: 3, name: 'Deleted elsewhere', createdAt: at, updatedAt: at },
    ],
  })
  await applyJournalChanges(journal, {
    beans: {
      keys: [{ id: 2 }, { id: 3 }, { id: 4 }],
      rows: [
        { id: 2, name: 'New name', createdAt: at, updatedAt: at },
        { id: 4, name: 'Created elsewhere', createdAt: at, updatedAt: at },
      ],
    },
  })
  const beans = await journal.client.query<{ id: number; name: string }>(
    'select id, name from beans order by id',
  )
  expect(beans.rows).toEqual([
    { id: 1, name: 'Kept' },
    { id: 2, name: 'New name' },
    { id: 4, name: 'Created elsewhere' },
  ])
})

test('a download replaces the rows the migrations seeded', async () => {
  const journal = await openJournal(true)
  const methods = await journal.client.query<{ id: number }>(
    'select id from brewing_methods order by id limit 1',
  )
  const types = await journal.client.query<{ id: number }>(
    'select id from drink_types order by id limit 1',
  )
  const links = await journal.client.query<{ id: number }>(
    'select id from brewing_method_drink_types order by id limit 1',
  )
  // Server identifiers start at 1, as the seeded rows do.
  await replaceJournalRows(journal, {
    brewing_method_drink_types: [
      {
        id: links.rows[0]?.id,
        brewingMethodId: methods.rows[0]?.id,
        drinkTypeId: types.rows[0]?.id,
      },
    ],
  })
  const owners = await journal.client.query<{ owner_id: string }>(
    'select distinct owner_id from brewing_method_drink_types',
  )
  expect(owners.rows).toEqual([{ owner_id: 'owner-a' }])
})

test('a synced journal takes every identifier from its reservation', async () => {
  const journal = await openJournal(true)
  await replaceJournalRows(journal, {})
  // Database defaults would number records the server never reserved.
  await expect(
    journal.client.query(
      "insert into beans (owner_id, name) values ('owner-a', 'Unreserved')",
    ),
  ).rejects.toThrow()
  await journal.client.query(
    "insert into roastbook_local.id_pool (table_name, id) values ('roasters', 950)",
  )
  const { createRoaster } = await import('@/journal/roasters')
  const roaster = await createRoaster({ data: { name: 'Reserved roaster' } })
  expect(roaster.id).toBe(950)
})
