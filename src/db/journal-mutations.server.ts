import '@tanstack/react-start/server-only'
import { getTableName, type SQL, sql, type Table } from 'drizzle-orm'
import { getDb } from '@/db'
import { journalOwnerId } from './journal-scope.server'

export type JournalMutation = {
  statement: SQL
  expectedChanges?: number
  conflictMessage?: string
}

export async function runJournalMutations(
  mutations: readonly JournalMutation[],
): Promise<void> {
  journalOwnerId()
  if (!mutations.length) return
  await getDb().transaction(async (transaction) => {
    for (const mutation of mutations) {
      const result = await transaction.execute(mutation.statement)
      if (
        mutation.expectedChanges !== undefined &&
        result.count !== mutation.expectedChanges
      )
        throw new Error(
          mutation.conflictMessage ??
            'This record changed. Reload and try again.',
        )
    }
  })
}

export async function allocateJournalIds(
  table: Table,
  count = 1,
): Promise<number[]> {
  journalOwnerId()
  if (!Number.isSafeInteger(count) || count < 1 || count > 500)
    throw new Error('Invalid journal identifier allocation')
  const name = getTableName(table)
  const rows = await getDb().execute<{ id: string }>(
    sql`select nextval(pg_get_serial_sequence(${name}, 'id'))::text as id from generate_series(1, ${count})`,
  )
  return rows.map((row) => {
    const id = Number(row.id)
    if (!Number.isSafeInteger(id) || id < 1)
      throw new Error('Journal identifier capacity exceeded')
    return id
  })
}
