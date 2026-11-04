import { rejectedPrefix } from '@/journal/codec'
import { getJournalFunction } from '@/journal/function'
import { setJournalConfig } from '@/journal/platform/config.browser'
import {
  pullJournal,
  pushJournalWrite,
  reserveJournalIds,
} from '@/lib/server/journal-sync'
import { type LocalJournal, notifyLocalChange } from './client'
import { replaceJournalRows, serialTables } from './snapshot'
import { setSyncStatus } from './sync-status'

type Pull = Awaited<ReturnType<typeof pullJournal>>
type Account = Pull['account']

/** The server marks changes it cannot apply; anything else is retried. */
function rejection(error: unknown) {
  return error instanceof Error && error.message.startsWith(rejectedPrefix)
    ? error.message.slice(rejectedPrefix.length)
    : undefined
}
// After this many failed attempts (about an hour) a change needs review.
const maxAttempts = 12
function isAuthError(error: unknown) {
  return (
    error instanceof Error &&
    /Authentication required|Unauthorized|Account is unavailable|401/.test(
      error.message,
    )
  )
}

export async function loadAccount(journal: LocalJournal) {
  return (await journal.getState<Account>('account')) ?? null
}

/** Replaces the owner's journal rows with the server's and reapplies pending writes. */
async function applyPull(journal: LocalJournal, pull: Pull) {
  // A session for another account must never fill this owner's journal.
  if (pull.account && pull.account.id !== journal.options.identity().id)
    throw new Error('Authentication required: signed in as another account')
  await journal.setState('account', pull.account)
  await journal.setState('config', pull.config)
  setJournalConfig(pull.config)
  if (pull.tables) {
    const upTo = await replaceJournalRows(
      journal,
      pull.tables as Record<string, object[]>,
    )
    await rebasePending(journal, upTo)
    // Pages in every tab show the downloaded changes.
    notifyLocalChange()
  }
  await journal.setState('revision', pull.revision)
  await journal.setState('lastSyncAt', new Date().toISOString())
}

/** Pending writes run again on top of the refreshed rows, with their recorded values. */
async function rebasePending(journal: LocalJournal, upTo: number) {
  const pending = await journal.client.query<{
    seq: number
    name: string
    input: unknown
    recorded: Record<string, unknown[]>
  }>(
    "select seq, name, input, recorded from roastbook_local.outbox where status = 'pending' and seq <= $1 order by seq",
    [upTo],
  )
  const { decodeInput } = await import('@/journal/codec')
  for (const entry of pending.rows) {
    const write = getJournalFunction(entry.name)
    try {
      if (!write) throw new Error('This change is no longer supported')
      await journal.run(write, decodeInput(entry.input), {
        recorded: entry.recorded,
      })
    } catch (error) {
      await journal.client.query(
        "update roastbook_local.outbox set status = 'conflict', error = $2 where seq = $1",
        [
          entry.seq,
          error instanceof Error
            ? error.message
            : 'This change no longer applies to your journal.',
        ],
      )
    }
  }
}

async function reserveIdentifiers(journal: LocalJournal) {
  const counts = await journal.client.query<{ table_name: string; n: number }>(
    'select table_name, count(*)::int as n from roastbook_local.id_pool group by table_name',
  )
  const available = new Map(counts.rows.map((r) => [r.table_name, r.n]))
  const low = serialTables.filter((name) => (available.get(name) ?? 0) < 64)
  if (!low.length) return
  const reserved = await reserveJournalIds({ data: low })
  for (const [table, ids] of Object.entries(reserved))
    await journal.client.query(
      'insert into roastbook_local.id_pool (table_name, id) select $1, unnest($2::bigint[]) on conflict do nothing',
      [table, ids],
    )
}

/** First download of a journal; requires a connection. */
export async function downloadJournal(journal: LocalJournal) {
  await applyPull(journal, await pullJournal({ data: { since: null } }))
  await reserveIdentifiers(journal)
}

async function pushPending(journal: LocalJournal) {
  for (;;) {
    const next = await journal.client.query<{
      seq: number
      name: string
      input: unknown
      recorded: Record<string, unknown[]>
      key: string
      attempts: number
      due: boolean
    }>(
      "select seq, name, input, recorded, key, attempts, next_attempt_at <= now() as due from roastbook_local.outbox where status = 'pending' order by seq limit 1",
    )
    const entry = next.rows[0]
    // Changes apply in order: a later one never overtakes one waiting to retry.
    if (!entry?.due) return
    const known = (await journal.getState<number>('revision')) ?? 0
    try {
      const result = await pushJournalWrite({
        data: {
          name: entry.name,
          input: entry.input,
          recorded: entry.recorded,
          key: entry.key,
          revision: known,
        },
      })
      await journal.client.query(
        'delete from roastbook_local.outbox where seq = $1',
        [entry.seq],
      )
      // Only this device changed the journal: the local rows already match.
      if (result.unchanged) await journal.setState('revision', result.revision)
    } catch (error) {
      const rejected = rejection(error)
      if (
        rejected !== undefined ||
        (!isAuthError(error) && entry.attempts + 1 >= maxAttempts)
      ) {
        await journal.client.query(
          "update roastbook_local.outbox set status = 'conflict', error = $2 where seq = $1",
          [
            entry.seq,
            rejected ??
              (error instanceof Error ? error.message : String(error)),
          ],
        )
        // Later changes may still apply; the review lists this one.
        continue
      }
      await journal.client.query(
        'update roastbook_local.outbox set attempts = attempts + 1, next_attempt_at = now() + make_interval(secs => least(300, 5 * power(2, attempts))), error = $2 where seq = $1',
        [entry.seq, error instanceof Error ? error.message : String(error)],
      )
      throw error
    }
  }
}

let running: Promise<void> | undefined
/** Sends pending writes in order, then downloads changes made elsewhere. */
export function synchronizeJournal(journal: LocalJournal) {
  // Offline, the `online` event starts the next sync.
  if (journal.closed || (typeof navigator !== 'undefined' && !navigator.onLine))
    return Promise.resolve()
  running ??= (async () => {
    setSyncStatus({ syncing: true })
    try {
      const run = async () => {
        await pushPending(journal)
        const since = (await journal.getState<number>('revision')) ?? null
        await applyPull(journal, await pullJournal({ data: { since } }))
        await reserveIdentifiers(journal)
      }
      // One tab synchronizes at a time.
      await (navigator.locks
        ? navigator.locks.request(
            `roastbook-sync-${journal.options.database}`,
            run,
          )
        : run())
      setSyncStatus({ error: null, authRequired: false })
    } catch (error) {
      setSyncStatus({
        error: error instanceof Error ? error.message : String(error),
        authRequired: isAuthError(error),
      })
    } finally {
      setSyncStatus({ syncing: false })
      running = undefined
      // Signing out closes the journal; nothing is left to report or retry.
      if (!journal.closed) {
        await refreshSyncStatus(journal)
        await scheduleRetry(journal)
      }
    }
  })()
  return running
}

let retry: ReturnType<typeof setTimeout> | undefined
/** Saved changes retry on their own after a failure, even in a hidden tab. */
async function scheduleRetry(journal: LocalJournal) {
  clearTimeout(retry)
  // Offline, the `online` event starts the next sync.
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  const next = await journal.client.query<{ wait: number | null }>(
    "select extract(epoch from min(next_attempt_at) - now()) * 1000 as wait from roastbook_local.outbox where status = 'pending'",
  )
  const wait = next.rows[0]?.wait
  if (wait === null || wait === undefined) return
  retry = setTimeout(
    () => void synchronizeJournal(journal).catch(() => undefined),
    Math.min(Math.max(Number(wait), 2_000), 300_000),
  )
}

export async function refreshSyncStatus(journal: LocalJournal) {
  const counts = await journal.client.query<{ status: string; n: number }>(
    'select status, count(*)::int as n from roastbook_local.outbox group by status',
  )
  const byStatus = new Map(counts.rows.map((row) => [row.status, row.n]))
  setSyncStatus({
    pending: byStatus.get('pending') ?? 0,
    conflicts: byStatus.get('conflict') ?? 0,
    lastSyncAt: (await journal.getState<string>('lastSyncAt')) ?? null,
  })
}

export type PendingChange = {
  seq: number
  name: string
  status: 'pending' | 'conflict'
  error: string | null
  createdAt: string
}

export async function listPendingChanges(journal: LocalJournal) {
  const result = await journal.client.query<PendingChange>(
    'select seq, name, status, error, created_at::text as "createdAt" from roastbook_local.outbox order by seq',
  )
  return result.rows
}

/** Sends a reviewed change again, unchanged. */
export async function retryChange(journal: LocalJournal, seq: number) {
  await journal.client.query(
    "update roastbook_local.outbox set status = 'pending', error = null, attempts = 0, next_attempt_at = now() where seq = $1",
    [seq],
  )
  // Its effect is not in the local rows any more; download them after it applies.
  await journal.setState('revision', null)
  await synchronizeJournal(journal)
}

/** Drops this device's version of a change and restores the server's journal. */
export async function discardChange(journal: LocalJournal, seq: number) {
  await journal.client.query(
    'delete from roastbook_local.outbox where seq = $1',
    [seq],
  )
  await journal.setState('revision', null)
  await synchronizeJournal(journal)
}
