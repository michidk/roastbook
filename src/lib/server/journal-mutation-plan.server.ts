import '@tanstack/react-start/server-only'
import {
  type JournalTable,
  journalTableMetadata,
  journalTableNames,
} from '@roastbook/journal-domain/model'
import type { JournalState } from '@roastbook/journal-domain/state'
import { type Column, eq, getTableColumns, type SQL, sql } from 'drizzle-orm'
import { db } from '@/db'
import type { JournalMutation } from '@/db/journal-mutations.server'
import {
  journalInsertValues,
  journalOwnerId,
  owned,
} from '@/db/journal-scope.server'
import * as schema from '@/db/schema'
import { queueMediaCleanup } from './media-lifecycle.server'

/** Plan one owner-scoped atomic batch, including its revision and replay receipt. */
export function planJournalMutations({
  before,
  after,
  commandId,
}: {
  before: JournalState
  after: JournalState
  commandId: string
}): JournalMutation[] {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .update(schema.journalSyncRevisions)
        .set({ value: sql`${schema.journalSyncRevisions.value}+1` })
        .where(
          owned(
            schema.journalSyncRevisions,
            eq(schema.journalSyncRevisions.value, before.serverRevision),
          ),
        )
        .getSQL(),
      expectedChanges: 1,
      conflictMessage:
        'JOURNAL_CONFLICT: The journal changed. Reload and resolve your local changes.',
    },
  ]
  const order = dependencyOrder()
  const deletedMedia: string[] = []
  for (const name of order) {
    const previous = new Map(
      before.tables[name].map((row) => [recordKey(name, row), row]),
    )
    // Demote thumbnails and update existing rows before inserting replacements.
    const changes = after.tables[name]
      .map((row) => ({ row, old: previous.get(recordKey(name, row)) }))
      .filter(({ row, old }) => JSON.stringify(old) !== JSON.stringify(row))
      .sort(
        (a, b) =>
          Number(Reflect.get(a.row, 'isThumbnail') === true) -
            Number(Reflect.get(b.row, 'isThumbnail') === true) ||
          Number(!a.old) - Number(!b.old),
      )
    for (const { row, old } of changes) {
      mutations.push({
        statement: old ? update(name, row) : insert(name, row),
        expectedChanges: 1,
      })
    }
  }
  for (const name of [...order].reverse()) {
    const live = new Set(after.tables[name].map((row) => recordKey(name, row)))
    for (const row of before.tables[name]) {
      const id = recordKey(name, row)
      if (live.has(id)) continue
      const key = primaryColumn(name)
      mutations.push({
        statement: sql`delete from ${schema[name]} where ${owned(schema[name])} and ${key} = ${id}`,
        expectedChanges: 1,
      })
      if ('storagePath' in row && typeof row.storagePath === 'string')
        deletedMedia.push(row.storagePath)
    }
  }
  mutations.push(...queueMediaCleanup(deletedMedia), {
    statement: db
      .insert(schema.journalCommandReceipts)
      .values(journalInsertValues({ commandId: commandId }))
      .getSQL(),
    expectedChanges: 1,
  })
  return mutations
}

function recordKey(name: JournalTable, row: object): unknown {
  return Reflect.get(row, journalTableMetadata[name].primaryKey)
}

function primaryColumn(name: JournalTable): Column {
  const columns: Record<string, Column> = getTableColumns(schema[name])
  const column = columns[journalTableMetadata[name].primaryKey]
  if (!column) throw new Error('Journal primary key missing')
  return column
}

function values(name: JournalTable, row: object) {
  const columns: Record<string, Column> = getTableColumns(schema[name])
  return Object.entries(row).map(([key, value]) => {
    const column = columns[key]
    if (!column) throw new Error('Unrecognized journal field')
    return {
      column,
      value: sql.param(
        journalTableMetadata[name].dates.includes(key) &&
          typeof value === 'string'
          ? new Date(value)
          : value,
        column,
      ),
    }
  })
}
function insert(name: JournalTable, row: object): SQL {
  const fields = values(name, row)
  return sql`insert into ${schema[name]} (${sql.identifier('owner_id')}, ${sql.join(
    fields.map(({ column }) => sql.identifier(column.name)),
    sql`, `,
  )}) values (${journalOwnerId()}, ${sql.join(
    fields.map(({ value }) => value),
    sql`, `,
  )})`
}
function update(name: JournalTable, row: object): SQL {
  const fields = values(name, row)
  const column = primaryColumn(name)
  return sql`update ${schema[name]} set ${sql.join(
    fields
      .filter((field) => field.column !== column)
      .map(
        ({ column, value }) => sql`${sql.identifier(column.name)} = ${value}`,
      ),
    sql`, `,
  )} where ${owned(schema[name])} and ${column} = ${recordKey(name, row)}`
}
function dependencyOrder(): JournalTable[] {
  const complete = new Set<JournalTable>()
  const result: JournalTable[] = []
  function visit(table: JournalTable) {
    if (complete.has(table)) return
    complete.add(table)
    for (const reference of journalTableMetadata[table].foreignKeys)
      visit(reference.parent)
    result.push(table)
  }
  for (const name of journalTableNames) visit(name)
  return result
}
