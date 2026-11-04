// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import { getTableName, type Table } from 'drizzle-orm'
import { getJournalContext } from '@/db/journal-context.server'
import { allocateJournalIds as allocate } from '@/db/journal-mutations.server'
import { takeRecordedValues } from '@/db/journal-replay.server'

export { db } from '@/db'
export {
  type JournalMutation,
  runJournalMutations,
} from '@/db/journal-mutations.server'
export {
  journalInsertValues,
  journalOwnerId,
  owned,
} from '@/db/journal-scope.server'
export { toDisplayableDatabaseError } from '@/lib/server/database-error.server'

/** Replays reuse the identifiers the browser chose from its reserved pool. */
export async function allocateJournalIds(table: Table, count = 1) {
  const recorded = takeRecordedValues(`id:${getTableName(table)}`, count)
  if (!recorded) return allocate(table, count)
  if (!recorded.every((id) => Number.isSafeInteger(id) && Number(id) > 0))
    throw new Error('Invalid replayed identifier')
  return recorded as number[]
}

/** The identity of the current journal scope, if any. */
export function journalIdentity() {
  return getJournalContext()?.identity
}
