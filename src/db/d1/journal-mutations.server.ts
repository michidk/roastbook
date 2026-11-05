import '@tanstack/react-start/server-only'
import {
  getTableColumns,
  getTableName,
  type SQL,
  sql,
  type Table,
} from 'drizzle-orm'
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import { requireCloudflareRuntime } from '@/cloudflare/context.server'
import { requireIdentity } from './journal-context.server'
import {
  authUsers,
  journalIdCounters,
  journalMutationAssertions,
} from './schema'

export type JournalMutation = {
  statement: SQL
  expectedChanges?: number
  conflictMessage?: string
}
const dialect = new SQLiteAsyncDialect()
function prepared(statement: SQL) {
  const query = dialect.sqlToQuery(statement)
  return requireCloudflareRuntime()
    .bindings.DB.prepare(query.sql)
    .bind(...query.params)
}

export async function runJournalMutations(
  mutations: readonly JournalMutation[],
): Promise<void> {
  const identity = requireIdentity()
  if (!mutations.length) return
  const assertionId = crypto.randomUUID()
  const cleanup = () =>
    prepared(
      sql`delete from ${journalMutationAssertions} where id = ${assertionId}`,
    )
  const statements = [
    prepared(
      sql`insert into ${journalMutationAssertions} (id, expected_changes, actual_changes) values (${assertionId}, 1, (select count(*) from ${authUsers} where id = ${identity.id} and deleting_at is null))`,
    ),
    cleanup(),
  ]
  for (const mutation of mutations) {
    statements.push(prepared(mutation.statement))
    if (mutation.expectedChanges === undefined) continue
    if (
      !Number.isSafeInteger(mutation.expectedChanges) ||
      mutation.expectedChanges < 0
    )
      throw new Error('Invalid expected mutation count')
    statements.push(
      prepared(
        sql`insert into ${journalMutationAssertions} (id, expected_changes, actual_changes) values (${assertionId}, ${mutation.expectedChanges}, changes())`,
      ),
      cleanup(),
    )
  }
  try {
    await requireCloudflareRuntime().bindings.DB.batch(statements)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('journal_mutation_assertions_match')
    )
      throw new Error(
        mutations.find((mutation) => mutation.conflictMessage)
          ?.conflictMessage ?? 'This record changed. Reload and try again.',
      )
    throw error
  }
}

const allocatedValue = z.object({
  value: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})
export async function allocateJournalIds(
  table: Table,
  count = 1,
): Promise<number[]> {
  requireIdentity()
  return allocateControlJournalIds(table, count)
}

/** Identifier reservation for account initialization before journal scope exists. */
export async function allocateControlJournalIds(
  table: Table,
  count = 1,
): Promise<number[]> {
  if (!Number.isSafeInteger(count) || count < 1 || count > 500)
    throw new Error('Invalid journal identifier allocation')
  const columns = getTableColumns(table)
  if (!('ownerId' in columns) || !('id' in columns))
    throw new Error('Identifier allocation requires a journal table')
  const name = getTableName(table)
  const result = await prepared(
    sql`insert into ${journalIdCounters} (table_name, value) values (${name}, (select coalesce(max(id), 0) + ${count} from ${table})) on conflict(table_name) do update set value = max(${journalIdCounters.value}, (select coalesce(max(id), 0) from ${table})) + ${count} returning value`,
  ).first()
  const { value } = allocatedValue.parse(result)
  return Array.from({ length: count }, (_, index) => value - count + index + 1)
}
