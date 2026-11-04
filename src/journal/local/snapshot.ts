import { getTableColumns, getTableName, sql } from 'drizzle-orm'
import { journalTables } from '@/journal/tables'
import { getStoredImagePaths } from '@/lib/image-path'
import type { LocalJournal } from './client'
import { forgetLocalMedia } from './media'

const tablesByName = new Map(journalTables.map((t) => [getTableName(t), t]))
export const serialTables = journalTables
  .filter((table) => getTableColumns(table).id?.columnType.endsWith('Serial'))
  .map((table) => getTableName(table))
const imageTables = [
  'bean_images',
  'gear_images',
  'coffee_shop_images',
  'brew_images',
  'cafe_visit_images',
]

/** Replaces the owner's journal rows, keyed by table name. */
export async function replaceJournalRows(
  journal: LocalJournal,
  tables: Record<string, readonly object[]>,
) {
  const owner = journal.options.identity().id
  await journal.db.transaction(async (tx) => {
    // The rows already satisfy every constraint; load them in any order.
    await tx.execute(sql`set local session_replication_role = replica`)
    for (const [name, table] of tablesByName) {
      await tx.execute(sql`delete from ${table} where owner_id = ${owner}`)
      const columns = Object.entries(getTableColumns(table))
      const rows = (tables[name] ?? []).map((row) => {
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
    // Local sequences stay ahead of loaded rows for journals that never sync.
    for (const name of serialTables)
      await tx.execute(
        sql`select setval(pg_get_serial_sequence(${name}, 'id'), coalesce((select max(id) from ${sql.identifier(name)}), 0) + 1, false)`,
      )
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
