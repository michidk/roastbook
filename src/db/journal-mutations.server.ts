import '@tanstack/react-start/server-only'
import type { Table } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  applyJournalMutations,
  type JournalMutation,
  journalIdAllocationQuery,
  parseJournalIds,
} from '@/lib/journal-mutations'
import { journalOwnerId } from './journal-scope.server'

export type { JournalMutation } from '@/lib/journal-mutations'

export async function runJournalMutations(
  mutations: readonly JournalMutation[],
): Promise<void> {
  journalOwnerId()
  if (!mutations.length) return
  await getDb().transaction((transaction) =>
    applyJournalMutations(
      mutations,
      async (statement) => (await transaction.execute(statement)).count,
    ),
  )
}

export async function allocateJournalIds(
  table: Table,
  count = 1,
): Promise<number[]> {
  journalOwnerId()
  const result = await getDb().execute<{ id: string }>(
    journalIdAllocationQuery(table, count),
  )
  return parseJournalIds(result)
}
