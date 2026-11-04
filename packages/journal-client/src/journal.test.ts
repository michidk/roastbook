import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import {
  emptyJournalTables,
  type JournalState,
  JournalTransaction,
} from '@roastbook/journal-domain/state'
import { z } from 'zod'
import { ClientJournal, type JournalOptions } from './journal'
import { journalCollection, journalQuery } from './queries'

const seed = (): JournalState => ({
  format: 1,
  revision: 0,
  serverRevision: 0,
  tables: emptyJournalTables(),
  mediaNamespace: 'demo',
  media: {},
  pending: [],
  account: null,
  identifiers: null,
  policy: { maxImagesPerItem: 3, limitBytes: 50 * 1024 * 1024 },
})
const execute: JournalOptions['execute'] = (state, command) => {
  const tx = new JournalTransaction(state.tables)
  const result = tx.insert('beans', { name: String(command.data) })
  return { state: { ...state, tables: tx.finish() }, result }
}
/** Mirrors the server: the journal is returned only when something else changed it. */
const reply = (remote: JournalState, revision: number) => ({
  serverRevision: remote.serverRevision,
  state: remote.serverRevision === revision + 1 ? null : remote,
})
const options = (name: string): JournalOptions => ({
  name,
  bootstrap: async () => seed(),
  execute,
})

test('seed once, persist across reopen, isolate visitors, and reset only the demo', async () => {
  const name = `journal${crypto.randomUUID().replaceAll('-', '')}`
  let seeded = 0
  const config = {
    ...options(name),
    bootstrap: async () => {
      seeded++
      return seed()
    },
  }
  let journal = await ClientJournal.open(config)
  await journal.command('beans/createBean', 'Local bean')
  await journal.close()
  journal = await ClientJournal.open(config)
  const visitor = await ClientJournal.open(options(`${name}other`))
  try {
    expect(seeded).toBe(1)
    expect((await journal.read()).tables.beans[0]?.name).toBe('Local bean')
    expect((await visitor.read()).tables.beans).toEqual([])
    expect((await journal.read()).pending).toEqual([])
    await visitor.command('beans/createBean', 'Other visitor')
    await journal.reset()
    expect((await journal.read()).tables.beans).toEqual([])
    expect((await visitor.read()).tables.beans[0]?.name).toBe('Other visitor')
  } finally {
    await journal.close()
    await visitor.close()
  }
})

test('TanStack queries follow committed journal revisions', async () => {
  const name = `journal${crypto.randomUUID().replaceAll('-', '')}`
  const first = await ClientJournal.open(options(name))
  const source = journalCollection(first)
  const query = journalQuery(source, (state) => ({
    count: state.tables.beans.length,
  }))
  try {
    await query.preload()
    expect(
      z.object({ count: z.number() }).parse([...query.values()][0]?.value)
        .count,
    ).toBe(0)
    await first.command('beans/createBean', 'Reactive bean')
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Query did not update')),
        2000,
      )
      const subscription = query.subscribeChanges(() => {
        if (
          z.object({ count: z.number() }).parse([...query.values()][0]?.value)
            .count === 1
        ) {
          clearTimeout(timeout)
          subscription.unsubscribe()
          resolve()
        }
      })
      if (
        z.object({ count: z.number() }).parse([...query.values()][0]?.value)
          .count === 1
      ) {
        clearTimeout(timeout)
        subscription.unsubscribe()
        resolve()
      }
    })
    expect(
      z.object({ count: z.number() }).parse([...query.values()][0]?.value)
        .count,
    ).toBe(1)
  } finally {
    await query.cleanup()
    await source.cleanup()
    await first.close()
  }
})

test('records and pending command are saved in the same durable state', async () => {
  const name = `journal${crypto.randomUUID().replaceAll('-', '')}`
  const journal = await ClientJournal.open({
    ...options(name),
    transport: {
      load: async () => seed(),
      send: async () => {
        throw new TypeError('Network unavailable')
      },
    },
  })
  try {
    await journal.command('beans/createBean', 'Offline bean')
    await expect(journal.synchronize()).rejects.toThrow('Network unavailable')
    expect((await journal.read()).tables.beans).toHaveLength(1)
    expect((await journal.read()).pending).toHaveLength(1)
    expect((await journal.read()).pending[0]?.status).toBe('pending')
  } finally {
    await journal.close()
  }
})

test('independent database instances preserve concurrent edits and broadcast reset', async () => {
  const { spyOn } = await import('bun:test')
  const dexie = await import('rxdb/plugins/storage-dexie')
  const factory = dexie.getRxStorageDexie
  let instance = 0
  // Separate tabs have separate RxDB duplicate-instance registries. Give each
  // wrapper a distinct registry name while retaining real Dexie storage and
  // its original database names and broadcast channels in this single process.
  const registryNames = spyOn(dexie, 'getRxStorageDexie').mockImplementation(
    () => {
      const storage = factory()
      storage.name = `tab-test-${instance++}`
      return storage
    },
  )
  let first: ClientJournal | undefined
  let second: ClientJournal | undefined
  try {
    const config = options(`journal${crypto.randomUUID().replaceAll('-', '')}`)
    ;[first, second] = await Promise.all([
      ClientJournal.open(config),
      ClientJournal.open(config),
    ])
    await Promise.all([
      first.command('beans/createBean', 'First tab'),
      second.command('beans/createBean', 'Second tab'),
    ])
    await waitForBeanCount(first, 2)
    await waitForBeanCount(second, 2)
    const saved = await first.read()
    expect(new Set(saved.tables.beans.map((row) => row.id)).size).toBe(2)
    await second.reset()
    await waitForBeanCount(first, 0)
  } finally {
    await first?.close()
    await second?.close()
    registryNames.mockRestore()
  }
})

function waitForBeanCount(journal: ClientJournal, count: number) {
  return new Promise<void>((resolve, reject) => {
    const unsubscribe = journal.subscribe((state) => {
      if (state.tables.beans.length === count)
        queueMicrotask(() => {
          clearTimeout(timeout)
          unsubscribe()
          resolve()
        })
    })
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(
        new Error(
          'Another journal instance did not receive the committed change',
        ),
      )
    }, 2000)
  })
}

test('a lost reply retries one logical command and preserves edits made during the request', async () => {
  const name = `journal${crypto.randomUUID().replaceAll('-', '')}`
  let remote = seed()
  const receipts = new Set<string>()
  let loseReply = true
  const journal = await ClientJournal.open({
    ...options(name),
    transport: {
      load: async () => remote,
      send: async (command, revision) => {
        if (!receipts.has(command.id)) {
          remote = {
            ...execute(remote, command).state,
            serverRevision: remote.serverRevision + 1,
          }
          receipts.add(command.id)
        }
        if (loseReply) {
          loseReply = false
          throw new TypeError('Reply lost')
        }
        return reply(remote, revision)
      },
    },
  })
  try {
    await journal.command('beans/createBean', 'First')
    await expect(journal.synchronize()).rejects.toThrow('Reply lost')
    await journal.command('beans/createBean', 'Second')
    await journal.synchronize()
    expect(
      (await journal.read()).tables.beans.map((bean) => bean.name),
    ).toEqual(['First', 'Second'])
    expect(remote.tables.beans).toHaveLength(2)
    expect(receipts.size).toBe(2)
    expect((await journal.read()).pending).toEqual([])
  } finally {
    await journal.close()
  }
})

test('a remote refresh cannot overwrite a concurrent local commit', async () => {
  let release: ((state: JournalState) => void) | undefined
  const response = new Promise<JournalState>((resolve) => {
    release = resolve
  })
  const journal = await ClientJournal.open({
    ...options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
    transport: {
      load: () => response,
      send: async () => ({ serverRevision: 1, state: seed() }),
    },
  })
  try {
    const refreshing = journal.synchronize()
    await new Promise((resolve) => setTimeout(resolve, 10))
    await journal.command('beans/createBean', 'Keep local')
    release?.(seed())
    await refreshing
    expect((await journal.read()).tables.beans[0]?.name).toBe('Keep local')
    expect((await journal.read()).pending).toHaveLength(1)
    await expect(journal.remove()).rejects.toThrow('pending changes')
    await expect(journal.reset()).rejects.toThrow('Product journals')
  } finally {
    await journal.close()
  }
})

test('conflicts retain local data across reopen and require explicit recovery', async () => {
  const { JournalSyncError } = await import('./journal')
  const config = {
    ...options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
    transport: {
      load: async () => seed(),
      send: async () => {
        throw new JournalSyncError('conflict', 'Other device changed')
      },
    },
  }
  let journal = await ClientJournal.open(config)
  await journal.command('beans/createBean', 'Conflict copy')
  await expect(journal.synchronize()).rejects.toThrow('Other device changed')
  await journal.close()
  journal = await ClientJournal.open(config)
  try {
    expect((await journal.read()).pending[0]?.status).toBe('conflict')
    expect((await journal.read()).tables.beans[0]?.name).toBe('Conflict copy')
    await journal.resolvePending('server')
    expect((await journal.read()).tables.beans).toEqual([])
    expect((await journal.read()).pending).toEqual([])
  } finally {
    await journal.close()
  }
})

test('concurrent local creates reserve distinct identifiers and are immediately queryable', async () => {
  const journal = await ClientJournal.open(
    options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
  )
  const source = journalCollection(journal)
  const { awaitJournalRevision } = await import('./queries')
  try {
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        journal.command('beans/createBean', `Coffee ${index}`),
      ),
    )
    const state = await journal.read()
    expect(state.tables.beans).toHaveLength(12)
    expect(new Set(state.tables.beans.map((row) => row.id)).size).toBe(12)
    await awaitJournalRevision(source, state.revision)
    const query = journalQuery(source, (current) => current.tables.beans.length)
    try {
      await query.preload()
      expect([...query.values()][0]?.value).toBe(12)
    } finally {
      await query.cleanup()
    }
  } finally {
    await source.cleanup()
    await journal.close()
  }
})

test('a quota failure preserves the previously saved journal and permits retry', async () => {
  const { spyOn } = await import('bun:test')
  const journal = await ClientJournal.open(
    options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
  )
  try {
    await journal.command('beans/createBean', 'Saved before quota')
    const before = await journal.read()
    const original = IDBObjectStore.prototype.put
    const failure = spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      function (this: IDBObjectStore, ...args: Parameters<typeof original>) {
        if (this.name.includes('docs'))
          throw new DOMException('Storage full', 'QuotaExceededError')
        return original.apply(this, args)
      },
    )
    try {
      await expect(
        journal.command('beans/createBean', 'Must not save'),
      ).rejects.toThrow('Browser storage is full')
    } finally {
      failure.mockRestore()
    }
    expect(await journal.read()).toEqual(before)
    await journal.command('beans/createBean', 'Saved after quota')
    expect((await journal.read()).tables.beans).toHaveLength(2)
  } finally {
    await journal.close()
  }
})

test('concurrent sync requests share a single delivery without Web Locks', async () => {
  let sent = 0
  let remote = seed()
  const journal = await ClientJournal.open({
    ...options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
    transport: {
      load: async () => remote,
      send: async (command, revision) => {
        sent++
        await new Promise((resolve) => setTimeout(resolve, 5))
        remote = {
          ...execute(remote, command).state,
          serverRevision: remote.serverRevision + 1,
        }
        return reply(remote, revision)
      },
    },
  })
  try {
    await journal.command('beans/createBean', 'Once')
    await Promise.all([
      journal.synchronize(),
      journal.synchronize(),
      journal.synchronize(),
    ])
    expect(sent).toBe(1)
    expect((await journal.read()).pending).toEqual([])
  } finally {
    await journal.close()
  }
})

async function changePersistedJournal(
  name: string,
  change: (value: unknown) => unknown,
) {
  const databases = await indexedDB.databases()
  const databaseName = databases.find(
    (entry) => entry.name?.includes(name) && entry.name.endsWith('--journal'),
  )?.name
  if (!databaseName) throw new Error('Saved journal database missing')
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('docs', 'readwrite')
      transaction.onerror = () => {
        database.close()
        reject(transaction.error)
      }
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      const cursor = transaction.objectStore('docs').openCursor()
      cursor.onsuccess = () => {
        const current = cursor.result
        if (!current) return
        const record: unknown = current.value
        if (
          record &&
          typeof record === 'object' &&
          Reflect.get(record, 'id') === 'journal'
        )
          current.update({
            ...record,
            value: change(Reflect.get(record, 'value')),
          })
        else current.continue()
      }
    }
  })
}

test('unsupported versions preserve data and never seed until an explicit demo reset', async () => {
  const name = `journal${crypto.randomUUID().replaceAll('-', '')}`
  const config = options(name)
  let journal = await ClientJournal.open(config)
  await journal.command('beans/createBean', 'Keep future data')
  await journal.close()
  await changePersistedJournal(name, (value) => ({
    ...z.record(z.string(), z.unknown()).parse(value),
    format: 2,
  }))
  let bootstrapped = false
  await expect(
    ClientJournal.open({
      ...config,
      bootstrap: async () => {
        bootstrapped = true
        return seed()
      },
    }),
  ).rejects.toThrow('unsupported format')
  expect(bootstrapped).toBe(false)
  // Return to the supported format to prove that rejecting open retained the actual data.
  await changePersistedJournal(name, (value) => ({
    ...z.record(z.string(), z.unknown()).parse(value),
    format: 1,
  }))
  journal = await ClientJournal.open(config)
  expect((await journal.read()).tables.beans[0]?.name).toBe('Keep future data')
  await journal.close()
  await changePersistedJournal(name, (value) => ({
    ...z.record(z.string(), z.unknown()).parse(value),
    format: 2,
  }))
  await ClientJournal.restoreDemo(config)
  journal = await ClientJournal.open(config)
  try {
    expect((await journal.read()).tables.beans).toEqual([])
  } finally {
    await journal.close()
  }
})

test('reset replaces added image bytes and journal data together', async () => {
  const config = options(`journal${crypto.randomUUID().replaceAll('-', '')}`)
  const journal = await ClientJournal.open({
    ...config,
    execute: (state, command) => {
      const executed = execute(state, command)
      return {
        ...executed,
        state: {
          ...executed.state,
          media: { 'local.webp': { mimeType: 'image/webp', data: 'YQ==' } },
        },
      }
    },
  })
  try {
    await journal.command('beans/createBean', 'Local with image')
    // The bytes leave the journal document for the separate media collection.
    expect((await journal.read()).media).toEqual({})
    await waitForMedia(journal, ['local.webp'])
    await journal.reset()
    await waitForMedia(journal, [])
    expect((await journal.read()).tables).toEqual(seed().tables)
  } finally {
    await journal.close()
  }
})

function waitForMedia(journal: ClientJournal, paths: string[]) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Media did not become ${paths.join(', ')}`))
    }, 2000)
    const unsubscribe = journal.subscribeMedia((media) => {
      if (JSON.stringify(Object.keys(media).sort()) !== JSON.stringify(paths))
        return
      clearTimeout(timeout)
      queueMicrotask(() => {
        unsubscribe()
        resolve()
      })
    })
  })
}

test('deleting an image row removes its stored bytes, thumbnails included', async () => {
  const path = 'journal/demo/1-a.webp'
  const files = {
    [path]: { mimeType: 'image/webp', data: 'YQ==' },
    'journal/demo/1-a.thumb.webp': { mimeType: 'image/webp', data: 'Yg==' },
    'journal/demo/1-a.small.webp': { mimeType: 'image/webp', data: 'Yw==' },
  }
  const journal = await ClientJournal.open({
    ...options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
    execute: (state, command) => {
      const tx = new JournalTransaction(state.tables)
      if (command.data === 'add') {
        const bean = tx.insert('beans', { name: 'Pictured' })
        const purchase = tx.insert('beanPurchases', { beanId: bean.id })
        tx.insert('beanImages', {
          beanId: bean.id,
          beanPurchaseId: purchase.id,
          storagePath: path,
          originalFilename: 'a.webp',
          mimeType: 'image/webp',
        })
        return {
          state: { ...state, tables: tx.finish(), media: files },
          result: null,
        }
      }
      for (const image of tx.rows('beanImages'))
        tx.delete('beanImages', image.id)
      return { state: { ...state, tables: tx.finish() }, result: null }
    },
  })
  try {
    await journal.command('images/upload', 'add')
    await waitForMedia(journal, Object.keys(files).sort())
    await journal.command('images/delete', 'remove')
    await waitForMedia(journal, [])
  } finally {
    await journal.close()
  }
})

test('acknowledged writes and unchanged refreshes never download the journal', async () => {
  let remote = seed()
  let downloads = 0
  const journal = await ClientJournal.open({
    ...options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
    transport: {
      load: async (state) => {
        if (state && state.serverRevision === remote.serverRevision) return null
        downloads++
        return remote
      },
      send: async (command, revision) => {
        remote = {
          ...execute(remote, command).state,
          serverRevision: remote.serverRevision + 1,
        }
        return reply(remote, revision)
      },
    },
  })
  try {
    await journal.command('beans/createBean', 'One')
    await journal.command('beans/createBean', 'Two')
    await journal.synchronize()
    await journal.synchronize()
    expect(downloads).toBe(0)
    expect((await journal.read()).serverRevision).toBe(2)
    expect((await journal.read()).tables.beans.map((bean) => bean.id)).toEqual(
      remote.tables.beans.map((bean) => bean.id),
    )
  } finally {
    await journal.close()
  }
})

test('a write after another device changed the journal rebases onto the returned journal', async () => {
  let remote = seed()
  const journal = await ClientJournal.open({
    ...options(`journal${crypto.randomUUID().replaceAll('-', '')}`),
    transport: {
      load: async () => remote,
      send: async (command, revision) => {
        remote = {
          ...execute(remote, command).state,
          serverRevision: remote.serverRevision + 1,
        }
        return reply(remote, revision)
      },
    },
  })
  try {
    // Another device writes directly to the server.
    remote = {
      ...execute(remote, {
        id: crypto.randomUUID(),
        operation: 'beans/createBean',
        data: 'Other device',
        createdAt: new Date().toISOString(),
        allocations: {},
      }).state,
      serverRevision: 1,
    }
    await journal.command('beans/createBean', 'This device')
    await journal.synchronize()
    const saved = await journal.read()
    expect(saved.pending).toEqual([])
    expect(saved.serverRevision).toBe(2)
    expect(saved.tables.beans.map((bean) => bean.name).sort()).toEqual([
      'Other device',
      'This device',
    ])
  } finally {
    await journal.close()
  }
})
