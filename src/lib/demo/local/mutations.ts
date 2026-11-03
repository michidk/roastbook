import { getTableName, type SQL, sql, type Table } from 'drizzle-orm'
import { getDb } from './database'

type JournalMutation = {
  statement: SQL
  expectedChanges?: number
  conflictMessage?: string
}

export async function runJournalMutations(
  mutations: readonly JournalMutation[],
) {
  await getDb().transaction(async (transaction) => {
    for (const mutation of mutations) {
      const result = await transaction.execute(mutation.statement)
      if (
        mutation.expectedChanges !== undefined &&
        result.affectedRows !== mutation.expectedChanges
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
  if (!Number.isSafeInteger(count) || count < 1 || count > 500)
    throw new Error('Invalid journal identifier allocation')
  const result = await getDb().execute<{ id: string }>(
    sql`select nextval(pg_get_serial_sequence(${getTableName(table)}, 'id'))::text as id from generate_series(1, ${count})`,
  )
  return result.rows.map(({ id }) => {
    const value = Number(id)
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error('Journal identifier capacity exceeded')
    return value
  })
}
