import type { PGlite } from '@electric-sql/pglite'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { sql } from 'drizzle-orm'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema'
import { encodeInput } from '@/journal/codec'
import type { JournalFunctionInfo } from '@/journal/function'
import { getOfflineOwner, registerOwnerCleanup } from '@/lib/journal-owner'
import { loadLocalMedia } from './media'

export type LocalDatabase = PgliteDatabase<typeof schema>
type Transaction = Parameters<Parameters<LocalDatabase['transaction']>[0]>[0]
export type LocalIdentity = {
  id: string
  email: string
  role: 'user' | 'admin'
  authentication: boolean
}
/** The journal scope that the browser platform modules read. */
export type LocalScope = {
  identity: LocalIdentity
  tx: Transaction
  /** Generated values, recorded for the server replay or reused from it. */
  recorded: Record<string, unknown[]>
  /** Set while re-running an outbox entry after a refresh. */
  replaying: boolean
  /** Synced journals use server-reserved identifiers. */
  sync: boolean
  committed: Array<() => void>
}

export type LocalJournalOptions = {
  /** Database name in IndexedDB. */
  database: string
  identity: () => LocalIdentity
  /** Demo journals never sync, so they allocate identifiers locally. */
  sync: boolean
  /** Called once when the local database has no journal yet. */
  bootstrap: (journal: LocalJournal) => Promise<void>
  /** Tests run against an in-process PGlite instead of the shared worker. */
  client?: LocalClient
}
type LocalClient = Pick<
  PGliteWorker,
  'query' | 'exec' | 'transaction' | 'syncToFs' | 'close'
>

let scope: LocalScope | undefined
export function currentScope() {
  return scope
}

const listeners = new Set<() => void>()
/** Notified after every committed local write, in this tab and others. */
export function subscribeLocalChanges(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
// Browser only: an open channel would keep a server-rendering process alive.
const channel =
  typeof window === 'undefined' || typeof BroadcastChannel === 'undefined'
    ? undefined
    : new BroadcastChannel('roastbook-local-journal')
// Another tab's pictures register before the pages that show them refresh.
let mediaClient: LocalClient | undefined
channel?.addEventListener('message', async () => {
  if (mediaClient) await loadLocalMedia(mediaClient).catch(() => undefined)
  for (const listener of listeners) listener()
})
export function notifyLocalChange() {
  for (const listener of listeners) listener()
  channel?.postMessage('changed')
}

/** Waits until the leader worker has written the database to IndexedDB. */
function flushWorker(database: string) {
  const channel = new BroadcastChannel(`roastbook-flush:${database}`)
  const id = crypto.randomUUID()
  return new Promise<void>((resolve, reject) => {
    const done = (error?: Error) => {
      clearTimeout(timer)
      channel.close()
      if (error) reject(error)
      else resolve()
    }
    const timer = setTimeout(
      () =>
        done(
          new Error(
            'The change was saved, but this browser has not stored it permanently yet. Keep this tab open so it can sync; do not enter it again.',
          ),
        ),
      30_000,
    )
    channel.onmessage = ({ data }) => {
      if (data?.reply === id)
        done(data.error ? new Error(String(data.error)) : undefined)
    }
    channel.postMessage({ flush: id })
  })
}

export class LocalJournal {
  private queue: Promise<unknown> = Promise.resolve()

  private constructor(
    readonly client: LocalClient,
    readonly db: LocalDatabase,
    readonly options: LocalJournalOptions,
  ) {}

  static async open(options: LocalJournalOptions) {
    const client = options.client ?? (await openWorker(options.database))
    const journal = new LocalJournal(
      client,
      drizzle(client as unknown as PGlite, { schema }),
      options,
    )
    if (!(await journal.getState('initialized'))) {
      await options.bootstrap(journal)
      await journal.setState('initialized', true)
    }
    await loadLocalMedia(client)
    mediaClient = client
    return journal
  }

  /** Runs one journal function as the owner, with the server's row security. */
  run(info: JournalFunctionInfo, input: unknown, replay?: Replay) {
    const result = this.queue.then(() => this.execute(info, input, replay))
    this.queue = result.catch(() => undefined)
    return result
  }

  private async execute(
    info: JournalFunctionInfo,
    input: unknown,
    replay?: Replay,
  ) {
    const encoded =
      info.kind === 'write' && this.options.sync && !replay
        ? await encodeInput(input)
        : undefined
    const committed: Array<() => void> = []
    const value = await this.db.transaction(async (tx) => {
      const identity = this.options.identity()
      await tx.execute(
        sql`select set_config('roastbook.user_id', ${identity.id}, true)`,
      )
      await tx.execute(sql`set local role roastbook_journal`)
      scope = {
        identity,
        tx,
        recorded: replay ? structuredClone(replay.recorded) : {},
        replaying: Boolean(replay),
        sync: this.options.sync,
        committed,
      }
      try {
        const result = await info.execute(input)
        if (encoded !== undefined)
          await tx.execute(
            sql`insert into roastbook_local.outbox (name, input, recorded, key) values (${info.name}, ${JSON.stringify(encoded)}::jsonb, ${JSON.stringify(scope.recorded)}::jsonb, ${crypto.randomUUID()})`,
          )
        return result
      } finally {
        scope = undefined
      }
    })
    // A write returns only after IndexedDB has it, outbox entry included.
    for (const effect of committed) effect()
    if (info.kind !== 'write') return value
    try {
      await (this.options.client
        ? this.client.syncToFs()
        : flushWorker(this.options.database))
    } finally {
      // Committed either way: pages refresh and the change syncs.
      notifyLocalChange()
    }
    return value
  }

  async getState<T = unknown>(key: string): Promise<T | undefined> {
    const result = await this.client.query<{ value: T }>(
      'select value from roastbook_local.state where key = $1',
      [key],
    )
    return result.rows[0]?.value
  }

  async setState(key: string, value: unknown) {
    await this.client.query(
      'insert into roastbook_local.state (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value',
      [key, JSON.stringify(value)],
    )
  }

  closed = false
  close() {
    this.closed = true
    return this.client.close()
  }
}

export type Replay = { recorded: Record<string, unknown[]> }

/** Closes a journal and removes its database from this browser. */
export async function deleteLocalJournal(journal: LocalJournal) {
  const { database } = journal.options
  await journal.close()
  // PGlite keeps `idb://<name>` in the IndexedDB database `/pglite/<name>`.
  indexedDB.deleteDatabase(`/pglite/${database}`)
}

async function openWorker(database: string) {
  // Tabs share one database through Web Locks, available only on HTTPS.
  if (typeof navigator === 'undefined' || !navigator.locks)
    throw new Error(
      'This browser cannot keep your journal here. Open Roastbook over HTTPS in a current browser.',
    )
  const client = new PGliteWorker(
    new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
    { meta: { database } },
  )
  try {
    await client.waitReady
  } catch (error) {
    throw new Error(
      'This browser could not open your journal storage. Your saved data has not been changed. Check that site storage is allowed, then reload.',
      { cause: error },
    )
  }
  return client
}

let opening: Promise<LocalJournal> | undefined
let openedFor: string | undefined
/** The local journal of the current owner. */
export function openLocalJournal(
  options: (owner: string) => LocalJournalOptions,
) {
  const owner = getOfflineOwner()
  if (opening && openedFor === owner) return opening
  openedFor = owner
  opening = LocalJournal.open(options(owner)).catch((error) => {
    opening = undefined
    throw error
  })
  return opening
}

registerOwnerCleanup(async () => {
  const journal = await opening?.catch(() => undefined)
  opening = undefined
  openedFor = undefined
  await journal?.close()
})

/** Local database names are derived from the owner, one journal per account. */
export function localDatabaseName(prefix: string, owner: string) {
  return `roastbook-${prefix}-${Array.from(owner)
    .map((character) => character.codePointAt(0)?.toString(16))
    .join('_')}`
}
