import { getTableColumns, getTableName, sql, type Table } from 'drizzle-orm'
import { journalTables, reservedIdTables } from '@/journal/tables'
import { getStoredImagePaths } from '@/lib/image-path'
import type { LocalJournal } from './client'
import { forgetLocalMedia } from './media'

const tablesByName = new Map(journalTables.map((t) => [getTableName(t), t]))
export const serialTables = reservedIdTables.map((table) => getTableName(table))
const imageTables = [
  'bean_images',
  'gear_images',
  'coffee_shop_images',
  'brew_images',
  'cafe_visit_images',
]

/**
 * Replaces the owner's journal rows, keyed by table name. Returns the last
 * outbox entry the replaced rows do not include yet.
 */
export async function replaceJournalRows(
  journal: LocalJournal,
  tables: Record<string, readonly object[]>,
) {
  const owner = journal.options.identity().id
  const pendingUpTo = await journal.db.transaction(async (tx) => {
    // The rows already satisfy every constraint; load them in any order.
    await tx.execute(sql`set local session_replication_role = replica`)
    // A device copy holds one owner. Rows seeded by the migrations belong to
    // `local` and would collide with the downloaded identifiers.
    for (const [name, table] of tablesByName) {
      await tx.execute(sql`delete from ${table}`)
      await insertRows(tx, table, owner, tables[name] ?? [])
    }
    // Journals that never sync number their own records. A synced journal
    // must take every identifier from the server's reservation, so its
    // sequences are exhausted: a forgotten `allocateJournalIds` fails loudly.
    for (const name of serialTables)
      await tx.execute(
        journal.options.sync
          ? sql`select setval(pg_get_serial_sequence(${name}, 'id'), 2147483647, true)`
          : sql`select setval(pg_get_serial_sequence(${name}, 'id'), coalesce((select max(id) from ${sql.identifier(name)}), 0) + 1, false)`,
      )
    const last = await tx.execute<{ seq: number }>(
      sql`select coalesce(max(seq), 0)::int as seq from roastbook_local.outbox`,
    )
    return Number(last.rows[0]?.seq ?? 0)
  })
  await collectMedia(journal)
  return pendingUpTo
}

type Transaction = Parameters<
  Parameters<LocalJournal['db']['transaction']>[0]
>[0]

async function insertRows(
  tx: Transaction,
  table: Table,
  owner: string,
  source: readonly object[],
) {
  const columns = Object.entries(getTableColumns(table))
  const rows = source.map((row) => {
    const value: Record<string, unknown> = { ...row, ownerId: owner }
    // JSON fixtures carry dates as text.
    for (const [key, column] of columns)
      if (column.dataType === 'date' && typeof value[key] === 'string')
        value[key] = new Date(value[key] as string)
    return value
  })
  for (let index = 0; index < rows.length; index += 500)
    await tx.insert(table).values(rows.slice(index, index + 500) as never)
}

/** Rows changed in one table: the keys that changed and their current rows. */
export type TableChanges = {
  readonly keys: readonly Record<string, unknown>[]
  readonly rows: readonly object[]
}

/**
 * Applies what changed on the server since this journal's revision: each
 * changed key is removed and replaced by its current row, if it still exists.
 * Only for a journal without pending writes, which a full download rebases.
 */
export async function applyJournalChanges(
  journal: LocalJournal,
  changes: Record<string, TableChanges>,
) {
  const owner = journal.options.identity().id
  await journal.db.transaction(async (tx) => {
    await tx.execute(sql`set local session_replication_role = replica`)
    for (const [name, change] of Object.entries(changes)) {
      const table = tablesByName.get(name)
      if (!table) continue
      for (let start = 0; start < change.keys.length; start += 200) {
        const matches = change.keys.slice(start, start + 200).map(
          (key) =>
            sql`(${sql.join(
              Object.entries(key).map(
                ([column, value]) => sql`${sql.identifier(column)} = ${value}`,
              ),
              sql` and `,
            )})`,
        )
        await tx.execute(
          sql`delete from ${table} where owner_id = ${owner} and (${sql.join(matches, sql` or `)})`,
        )
      }
      await insertRows(tx, table, owner, change.rows)
    }
  })
  await collectMedia(journal)
}

/** Removes stored pictures that no record references any more. */
export async function collectMedia(journal: LocalJournal) {
  const referenced = await journal.client.query<{ path: string }>(
    imageTables
      .map((table) => `select storage_path as path from ${table}`)
      .join(' union '),
  )
  const keep = new Set(
    getStoredImagePaths(referenced.rows.map((row) => row.path)),
  )
  const stored = await journal.client.query<{ path: string }>(
    'select path from roastbook_local.media',
  )
  const orphaned = stored.rows
    .map((row) => row.path)
    .filter((path) => !keep.has(path))
  if (!orphaned.length) return
  await journal.client.query(
    'delete from roastbook_local.media where path = any($1)',
    [orphaned],
  )
  forgetLocalMedia(orphaned)
}
