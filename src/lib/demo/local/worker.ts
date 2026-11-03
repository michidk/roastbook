import { PGlite } from '@electric-sql/pglite'
// Resolved by the allowlisted build, never by the application's server graph.
import { operations } from 'demo-local-registry'
import { z } from 'zod'
import * as schema from '@/db/schema'
import { setDemoDatabase } from './database'
import type { LocalOperation } from './function'
import { demoMedia } from './media'
import {
  DEMO_DATABASE_VERSION,
  type DemoSnapshot,
  openDemoStorage,
  readDemoSnapshot,
  saveDemoSnapshot,
} from './persistence'

const requestSchema = z.object({
  id: z.number().int(),
  operation: z.string(),
  data: z.unknown(),
})
const migrationSchema = z.array(z.object({ name: z.string(), sql: z.string() }))
let client: PGlite | undefined
let revision: string | undefined
let assets:
  | Promise<{
      fsBundle: Blob
      pgliteWasmModule: WebAssembly.Module
      initdbWasmModule: WebAssembly.Module
    }>
  | undefined
let migrations: Promise<z.infer<typeof migrationSchema>> | undefined

async function fetchAsset(path: string) {
  try {
    const response = await fetch(`/demo-local/${path}`, {
      signal: AbortSignal.timeout(60_000),
    })
    if (response.ok) return response
  } catch {
    // Network failures must not be mistaken for an empty local journal.
  }
  throw new Error(
    'Could not load the browser demo. Reconnect and reload. Your saved data has not been changed.',
  )
}

async function loadClient(snapshot: Blob) {
  if (client) {
    await client.close()
    client = undefined
  }
  assets ??= Promise.all([
    fetchAsset('pglite.data').then((response) => response.blob()),
    fetchAsset('pglite.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => WebAssembly.compile(buffer)),
    fetchAsset('initdb.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => WebAssembly.compile(buffer)),
  ])
    .then(([fsBundle, pgliteWasmModule, initdbWasmModule]) => ({
      fsBundle,
      pgliteWasmModule,
      initdbWasmModule,
    }))
    .catch((error) => {
      assets = undefined
      throw new Error(
        'Could not load the browser demo engine. Reconnect and reload. Your saved journal has not been changed.',
        { cause: error },
      )
    })
  client = await PGlite.create({
    dataDir: 'memory://',
    loadDataDir: snapshot,
    ...(await assets),
  })
  setDemoDatabase(client, schema)
  return client
}

export async function executeDemoOperation(operation: string, data: unknown) {
  if (operation === 'shottimer/getPendingShottimerShot') return { value: null }
  if (operation === 'passkey-prompt/getPasskeySetupOffer')
    return { value: { ownerId: 'demo', offer: false } }
  const handler: LocalOperation | undefined = operations.get(operation)
  if (!handler && operation !== 'demo/reset')
    throw new Error(
      'This integration is unavailable in the browser demo. Journal changes stay in this browser and never sync to a server.',
    )
  if (!navigator.locks)
    throw new Error(
      'This browser does not support safe local demo storage. Use a current browser with Web Locks support. Your saved data has not been changed.',
    )
  return navigator.locks.request('roastbook-browser-demo', async () => {
    const storage = await openDemoStorage()
    try {
      const reset = operation === 'demo/reset'
      const saved = reset ? undefined : await readDemoSnapshot(storage)
      migrations ??= fetchAsset('migrations.json')
        .then((response) => response.json())
        .then((value: unknown) => migrationSchema.parse(value))
        .catch((error) => {
          migrations = undefined
          throw error
        })
      const available = await migrations
      const latest = available.at(-1)?.name
      if (!latest) throw new Error('Demo migrations are unavailable')
      const restore = !saved || reset || revision !== saved.revision || !client
      if (restore) {
        await loadClient(
          saved && !reset
            ? saved.snapshot
            : await fetchAsset('seed.tar.gz').then((response) =>
                response.blob(),
              ),
        )
        demoMedia.clear()
        if (saved && !reset)
          for (const { path, blob } of saved.media) demoMedia.set(path, blob)
        revision = saved?.revision
      }
      if (!client)
        throw new Error(
          'The local demo could not start. Your saved data has not been changed.',
        )
      if (saved && !reset && saved.schemaVersion > latest)
        throw new Error(
          'This saved demo needs a newer version of Roastbook. Your data has been preserved. Reload after updating the site.',
        )
      const pending =
        saved && !reset
          ? available.filter(({ name }) => name > saved.schemaVersion)
          : []
      try {
        if (pending.length)
          await client.transaction(async (transaction) => {
            for (const migration of pending)
              await transaction.exec(
                migration.sql.replaceAll('--> statement-breakpoint', ''),
              )
          })
        const value = reset ? undefined : await handler?.run(data)
        const changed =
          reset || !saved || pending.length > 0 || handler?.method === 'POST'
        if (changed) {
          const next: DemoSnapshot = {
            version: DEMO_DATABASE_VERSION,
            revision: crypto.randomUUID(),
            schemaVersion: latest,
            snapshot: await client.dumpDataDir('gzip'),
            media: [...demoMedia].map(([path, blob]) => ({ path, blob })),
          }
          await saveDemoSnapshot(storage, next)
          revision = next.revision
        }
        return {
          value,
          changed,
          media:
            restore || changed
              ? [...demoMedia].map(([path, blob]) => ({ path, blob }))
              : undefined,
        }
      } catch (error) {
        // Discard only the failed in-memory attempt. The committed IDB entry is untouched.
        await client.close()
        client = undefined
        revision = undefined
        demoMedia.clear()
        throw error
      }
    } finally {
      storage.close()
    }
  })
}

self.onmessage = async (event: MessageEvent<unknown>) => {
  const request = requestSchema.safeParse(event.data)
  if (!request.success) return
  const { id, operation, data } = request.data
  try {
    self.postMessage({
      id,
      kind: 'success',
      ...(await executeDemoOperation(operation, data)),
    })
  } catch (error) {
    self.postMessage({
      id,
      kind: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'The browser demo could not save. Your previously saved journal is preserved.',
    })
  }
}
