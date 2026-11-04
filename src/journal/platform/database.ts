// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import { eq, getTableName, inArray, type Table } from 'drizzle-orm'
import { db } from '@/db'
import { getJournalContext } from '@/db/journal-context.server'
import { allocateJournalIds as allocate } from '@/db/journal-mutations.server'
import { takeRecordedValues } from '@/db/journal-replay.server'
import { owned } from '@/db/journal-scope.server'
import { journalIdReservations } from '@/db/schema'

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
  const name = getTableName(table)
  const recorded = takeRecordedValues(`id:${name}`, count)
  if (!recorded) return allocate(table, count)
  const ids = recorded.map(Number)
  if (
    !ids.every((id) => Number.isSafeInteger(id) && id > 0) ||
    new Set(ids).size !== ids.length
  )
    throw new Error('Invalid replayed identifier')
  // Only identifiers the server reserved for this owner; primary keys stop reuse.
  for (let start = 0; start < ids.length; start += 90) {
    const chunk = ids.slice(start, start + 90)
    const found = await db
      .select({ id: journalIdReservations.id })
      .from(journalIdReservations)
      .where(
        owned(
          journalIdReservations,
          eq(journalIdReservations.tableName, name),
          inArray(journalIdReservations.id, chunk),
        ),
      )
    if (found.length !== chunk.length)
      throw new Error('Invalid replayed identifier')
  }
  return ids
}

/** The identity of the current journal scope, if any. */
export function journalIdentity() {
  return getJournalContext()?.identity
}
