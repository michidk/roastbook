import { PGlite } from '@electric-sql/pglite'
import { worker } from '@electric-sql/pglite/worker'
import { migrateJournal } from './migrate'

// The same migrations as the server, applied once each, in order.
const migrations = import.meta.glob<string>('/drizzle/*.sql', {
  query: '?raw',
  import: 'default',
})

// Compiling from bytes works whatever content type the server sends for .wasm.
async function download(url: URL) {
  const response = await fetch(url).catch(() => undefined)
  if (!response?.ok)
    throw new Error(
      'Could not download the journal engine. Reconnect and reload. Your saved journal has not changed.',
    )
  return response
}
async function engineAssets() {
  const [pglite, initdb, data] = await Promise.all([
    download(
      new URL(
        '../../../node_modules/@electric-sql/pglite/dist/pglite.wasm',
        import.meta.url,
      ),
    ),
    download(
      new URL(
        '../../../node_modules/@electric-sql/pglite/dist/initdb.wasm',
        import.meta.url,
      ),
    ),
    download(
      new URL(
        '../../../node_modules/@electric-sql/pglite/dist/pglite.data',
        import.meta.url,
      ),
    ),
  ])
  return {
    pgliteWasmModule: await WebAssembly.compile(await pglite.arrayBuffer()),
    initdbWasmModule: await WebAssembly.compile(await initdb.arrayBuffer()),
    fsBundle: await data.blob(),
  }
}

worker({
  async init(options) {
    const name = String(options.meta?.database ?? '')
    if (!/^roastbook-[a-z0-9_-]+$/.test(name))
      throw new Error('Invalid local journal name')
    // Reads skip the IndexedDB flush; writes ask for the flush below.
    const db = await PGlite.create(`idb://${name}`, {
      relaxedDurability: true,
      ...(await engineAssets()),
    }).catch((error) => {
      // PGlite's worker does not report init failures to the page.
      console.error('[journal-worker] create failed', error)
      throw error
    })
    await migrateJournal(db, migrations).catch((error) => {
      console.error('[journal-worker] migrate failed', error)
      throw error
    })
    // PGlite's relaxed flush returns before IndexedDB has the data. This one
    // runs between queries, so the stored copy is consistent when it resolves.
    const flushes = new BroadcastChannel(`roastbook-flush:${name}`)
    flushes.onmessage = async ({ data }) => {
      if (typeof data?.flush !== 'string') return
      try {
        await db._runExclusiveQuery(
          () => db.fs?.syncToFs(false) ?? Promise.resolve(),
        )
        flushes.postMessage({ reply: data.flush })
      } catch (error) {
        flushes.postMessage({ reply: data.flush, error: String(error) })
      }
    }
    return db
  },
})
