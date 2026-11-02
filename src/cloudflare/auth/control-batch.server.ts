import '@tanstack/react-start/server-only'
import { type SQL, sql } from 'drizzle-orm'
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core'
import { requireCloudflareRuntime } from '../context.server'

export function assertControlCondition(condition: SQL): SQL[] {
  const id = crypto.randomUUID()
  return [
    sql`insert into journal_mutation_assertions(id,expected_changes,actual_changes) values (${id},1,case when ${condition} then 1 else 0 end)`,
    sql`delete from journal_mutation_assertions where id=${id}`,
  ]
}
export function assertControlChanges(expected: number): SQL[] {
  const id = crypto.randomUUID()
  return [
    sql`insert into journal_mutation_assertions(id,expected_changes,actual_changes) values (${id},${expected},changes())`,
    sql`delete from journal_mutation_assertions where id=${id}`,
  ]
}
export async function runControlBatch(
  statements: readonly SQL[],
  conflictMessage: string,
) {
  const database = requireCloudflareRuntime().bindings.DB
  const dialect = new SQLiteAsyncDialect()
  try {
    await database.batch(
      statements.map((statement) => {
        const query = dialect.sqlToQuery(statement)
        if (query.params.length > 100)
          throw new Error('D1 statement exceeds parameter limit')
        return database.prepare(query.sql).bind(...query.params)
      }),
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('journal_mutation_assertions_match')
    )
      throw new Error(conflictMessage)
    throw error
  }
}
