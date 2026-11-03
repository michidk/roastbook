import { getTableName, type SQL, sql, type Table } from 'drizzle-orm'

export type JournalMutation = {
  statement: SQL
  expectedChanges?: number
  conflictMessage?: string
}

export async function applyJournalMutations(
  mutations: readonly JournalMutation[],
  execute: (statement: SQL) => Promise<number | undefined>,
) {
  for (const mutation of mutations) {
    const changes = await execute(mutation.statement)
    if (
      mutation.expectedChanges !== undefined &&
      changes !== mutation.expectedChanges
    )
      throw new Error(
        mutation.conflictMessage ??
          'This record changed. Reload and try again.',
      )
  }
}

export function journalIdAllocationQuery(table: Table, count: number) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 500)
    throw new Error('Invalid journal identifier allocation')
  return sql`select nextval(pg_get_serial_sequence(${getTableName(table)}, 'id'))::text as id from generate_series(1, ${count})`
}

export function parseJournalIds(rows: readonly { id: string }[]) {
  return rows.map(({ id }) => {
    const value = Number(id)
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error('Journal identifier capacity exceeded')
    return value
  })
}
