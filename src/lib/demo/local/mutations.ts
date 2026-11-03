import type { Table } from 'drizzle-orm'
import {
  applyJournalMutations,
  type JournalMutation,
  journalIdAllocationQuery,
  parseJournalIds,
} from '@/lib/journal-mutations'
import { getDb } from './database'

export async function runJournalMutations(
  mutations: readonly JournalMutation[],
): Promise<void> {
  await getDb().transaction((transaction) =>
    applyJournalMutations(
      mutations,
      async (statement) => (await transaction.execute(statement)).affectedRows,
    ),
  )
}

export async function allocateJournalIds(
  table: Table,
  count = 1,
): Promise<number[]> {
  const result = await getDb().execute<{ id: string }>(
    journalIdAllocationQuery(table, count),
  )
  return parseJournalIds(result.rows)
}
