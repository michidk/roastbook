import '@tanstack/react-start/server-only'
import {
  and,
  count,
  eq,
  getTableColumns,
  getTableName,
  inArray,
  sql,
} from 'drizzle-orm'
import { db } from '@/db'
import { JournalBusyError } from '@/db/journal-admission.server'
import { getJournalContext } from '@/db/journal-context.server'
import { allocateJournalIds } from '@/db/journal-mutations.server'
import {
  type RecordedValues,
  withRecordedValues,
} from '@/db/journal-replay.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import {
  journalCommandReceipts,
  journalIdReservations,
  journalSyncRevisions,
} from '@/db/schema'
import { decodeInput } from '@/journal/codec'
import { getJournalFunction } from '@/journal/function'
import '@/journal/registry'
import { rejectedPrefix } from '@/journal/codec'
import { journalConfig } from '@/journal/platform/config'
import { journalTables, reservedIdTables } from '@/journal/tables'

type JournalValue =
  | string
  | number
  | boolean
  | null
  | Date
  | JournalValue[]
  | { [key: string]: JournalValue }
/** Rows of each journal table, keyed by table name. */
export type JournalRows = Record<string, Array<Record<string, JournalValue>>>

export const journalWriteName = /^([a-z-]+)\/[A-Za-z0-9]+$/

async function revision() {
  const [row] = await db
    .select({ value: journalSyncRevisions.value })
    .from(journalSyncRevisions)
    .where(owned(journalSyncRevisions))
  return row?.value ?? 0
}

function account() {
  const identity = getJournalContext()?.identity
  return identity?.authentication
    ? { id: identity.id, email: identity.email, role: identity.role }
    : null
}

/** The owner's journal rows, unless the browser already has this revision. */
export async function loadJournalRows(since: number | null) {
  const current = await revision()
  const config = journalConfig()
  if (since === current)
    return { revision: current, tables: null, account: account(), config }
  const tables: JournalRows = {}
  for (const table of journalTables)
    tables[getTableName(table)] = (await db
      .select()
      .from(table)
      .where(owned(table as never))) as Array<Record<string, JournalValue>>
  return { revision: current, tables, account: account(), config }
}

/**
 * Replays one write recorded by a browser, with the identifiers and paths the
 * browser chose. Each write applies once; the request transaction makes the
 * write and its receipt atomic on PostgreSQL.
 */
export async function replayJournalWrite(data: {
  name: string
  input: unknown
  recorded: RecordedValues
  key: string
  revision: number
}) {
  const [receipt] = await db
    .select({ key: journalCommandReceipts.commandId })
    .from(journalCommandReceipts)
    .where(
      owned(
        journalCommandReceipts,
        eq(journalCommandReceipts.commandId, data.key),
      ),
    )
  if (receipt) return { revision: await revision(), unchanged: false }
  const before = await revision()
  try {
    const write = getJournalFunction(data.name)
    if (write?.kind !== 'write')
      throw new Error('This change is not supported by this server version')
    await withRecordedValues(data.recorded, () =>
      write.execute(decodeInput(data.input)),
    )
  } catch (error) {
    if (await alreadyApplied(data).catch(() => false)) {
      await db
        .insert(journalCommandReceipts)
        .values(journalInsertValues({ commandId: data.key }))
        .onConflictDoNothing()
      return { revision: await revision(), unchanged: false }
    }
    if (isTransient(error)) throw error
    // The browser keeps this change for review instead of retrying it.
    throw new Error(
      `${rejectedPrefix}${error instanceof Error ? error.message : String(error)}`,
    )
  }
  await db
    .insert(journalCommandReceipts)
    .values(journalInsertValues({ commandId: data.key }))
  return { revision: await revision(), unchanged: before === data.revision }
}

const reservationBatch = 256
// shortcut: past this many unused identifiers per table (several devices or
// lost browser storage), the oldest are handed out again instead of new ones.
const reservationLimit = 1024

/**
 * Whether a failed replay had in fact applied: a simultaneous push of the same
 * change committed first, or a D1 replay stopped between its write and its
 * receipt. Identifiers are reserved per owner, so recorded rows prove it.
 */
async function alreadyApplied(data: { key: string; recorded: RecordedValues }) {
  const [receipt] = await db
    .select({ key: journalCommandReceipts.commandId })
    .from(journalCommandReceipts)
    .where(
      owned(
        journalCommandReceipts,
        eq(journalCommandReceipts.commandId, data.key),
      ),
    )
  if (receipt) return true
  const created = Object.entries(data.recorded).filter(([kind]) =>
    kind.startsWith('id:'),
  )
  if (!created.length) return false
  for (const [kind, ids] of created) {
    const table = reservedIdTables.find(
      (candidate) => `id:${getTableName(candidate)}` === kind,
    )
    const id = table && getTableColumns(table).id
    if (!table || !id || !ids.every((value) => Number.isSafeInteger(value)))
      return false
    for (let start = 0; start < ids.length; start += 90) {
      const chunk = ids.slice(start, start + 90) as number[]
      const [found] = await db
        .select({ value: count() })
        .from(table)
        .where(owned(table as never, inArray(id, chunk)))
      if (found?.value !== chunk.length) return false
    }
  }
  return true
}

/** Infrastructure failures that a later attempt can get past. */
function isTransient(error: unknown): boolean {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if (cause instanceof JournalBusyError) return true
    const code = (cause as { code?: unknown }).code
    // PostgreSQL connection, concurrency, resource and system errors.
    if (typeof code === 'string' && /^(08|40|53|57|58|XX)/.test(code))
      return true
    if (
      /ECONN|socket|network|timed? ?out|D1_ERROR: .*(reset|overloaded|internal error)/i.test(
        cause.message,
      )
    )
      return true
  }
  return false
}

/** Identifiers this device may assign to records it creates offline. */
export async function reserveJournalIdentifiers(names: readonly string[]) {
  const reserved: Record<string, number[]> = {}
  for (const table of reservedIdTables) {
    const name = getTableName(table)
    if (!names.includes(name)) continue
    const forTable = owned(
      journalIdReservations,
      eq(journalIdReservations.tableName, name),
    )
    // Reservations that a record now uses are spent.
    await db
      .delete(journalIdReservations)
      .where(
        and(
          forTable,
          sql`exists (select 1 from ${table} where ${getTableColumns(table).id} = ${journalIdReservations.id})`,
        ),
      )
    const [unused] = await db
      .select({ value: count() })
      .from(journalIdReservations)
      .where(forTable)
    if ((unused?.value ?? 0) >= reservationLimit) {
      const oldest = await db
        .select({ id: journalIdReservations.id })
        .from(journalIdReservations)
        .where(forTable)
        .orderBy(journalIdReservations.id)
        .limit(reservationBatch)
      reserved[name] = oldest.map((row) => row.id)
      continue
    }
    const ids = await allocateJournalIds(table, reservationBatch)
    // 30 rows keep each statement within D1's bound-parameter limit.
    for (let start = 0; start < ids.length; start += 30)
      await db
        .insert(journalIdReservations)
        .values(
          ids
            .slice(start, start + 30)
            .map((id) => journalInsertValues({ tableName: name, id })),
        )
    reserved[name] = ids
  }
  return reserved
}
