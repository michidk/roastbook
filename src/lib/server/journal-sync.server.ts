import '@tanstack/react-start/server-only'
import { eq, getTableColumns, getTableName } from 'drizzle-orm'
import { db } from '@/db'
import { getJournalContext } from '@/db/journal-context.server'
import { allocateJournalIds } from '@/db/journal-mutations.server'
import {
  type RecordedValues,
  withRecordedValues,
} from '@/db/journal-replay.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { journalCommandReceipts, journalSyncRevisions } from '@/db/schema'
import { decodeInput } from '@/journal/codec'
import { getJournalFunction } from '@/journal/function'
import '@/journal/registry'
import { journalConfig } from '@/journal/platform/config'
import { journalTables } from '@/journal/tables'

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
  const write = getJournalFunction(data.name)
  if (write?.kind !== 'write')
    throw new Error('This change is not supported by this server version')
  await withRecordedValues(data.recorded, () =>
    write.execute(decodeInput(data.input)),
  )
  await db
    .insert(journalCommandReceipts)
    .values(journalInsertValues({ commandId: data.key }))
  return { revision: await revision(), unchanged: before === data.revision }
}

/** Identifiers this device may assign to records it creates offline. */
export async function reserveJournalIdentifiers(names: readonly string[]) {
  const reserved: Record<string, number[]> = {}
  for (const table of journalTables) {
    const name = getTableName(table)
    if (
      names.includes(name) &&
      getTableColumns(table).id?.columnType.endsWith('Serial')
    )
      reserved[name] = await allocateJournalIds(table, 256)
  }
  return reserved
}
