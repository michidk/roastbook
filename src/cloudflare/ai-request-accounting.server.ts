import '@tanstack/react-start/server-only'
import { and, eq, sql } from 'drizzle-orm'
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import { getAiControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { aiRequestLogs } from '@/db/schema'
import { aiAllowanceWeek } from '@/lib/ai-allowance'
import { providedAiConfig } from '@/lib/server/ai-allowance.server'
import {
  assertControlChanges,
  assertControlCondition,
} from './auth/control-batch.server'
import { requireCloudflareRuntime } from './context.server'
import { notifyUser } from './hosted-email.server'

const exhausted =
  'Your free AI allowance is exhausted. It resets Monday at 00:00 UTC. You can also use BYOAI in Settings > AI.'
export async function startAiAccounting(
  values: typeof aiRequestLogs.$inferInsert,
): Promise<number> {
  const identity = requireIdentity()
  if (!identity.authentication)
    throw new Error('Hosted AI requires authentication')
  const provided = values.providerMode === 'provided'
  if (provided && !providedAiConfig())
    throw new Error('Provided AI is unavailable')
  const statements = assertControlCondition(
    sql`exists(select 1 from auth_users where id=${identity.id} and deleting_at is null)`,
  )
  if (provided) {
    const start = aiAllowanceWeek().start.getTime()
    statements.push(
      sql`insert into ai_weekly_usage(user_id,week_start,requests) select id,${start},1 from auth_users where id=${identity.id} and deleting_at is null and ai_weekly_limit>0 on conflict(user_id,week_start) do update set requests=ai_weekly_usage.requests+1 where ai_weekly_usage.requests<(select ai_weekly_limit from auth_users where id=${identity.id} and deleting_at is null)`,
      ...assertControlChanges(1),
    )
  }
  const database = requireCloudflareRuntime().bindings.DB
  const dialect = new SQLiteAsyncDialect()
  const batch = statements.map((statement) => {
    const query = dialect.sqlToQuery(statement)
    return database.prepare(query.sql).bind(...query.params)
  })
  const insert = getAiControlDb()
    .insert(aiRequestLogs)
    .values({ ...values, ownerId: identity.id })
    .returning({ id: aiRequestLogs.id })
    .toSQL()
  batch.push(database.prepare(insert.sql).bind(...insert.params))
  try {
    const result = await database.batch(batch)
    const entry = result[result.length - 1]?.results[0]
    const id = z.object({ id: z.number().int().positive() }).parse(entry).id
    if (provided) await warnWhenQuotaLow(identity.id, identity.email)
    return id
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('journal_mutation_assertions_match')
    )
      throw new Error(provided ? exhausted : 'Account is unavailable')
    throw error
  }
}
export async function updateAiAccounting(
  id: number,
  values: Partial<typeof aiRequestLogs.$inferInsert>,
) {
  const identity = requireIdentity()
  const [row] = await getAiControlDb()
    .update(aiRequestLogs)
    .set(values)
    .where(
      and(eq(aiRequestLogs.ownerId, identity.id), eq(aiRequestLogs.id, id)),
    )
    .returning({
      requestType: aiRequestLogs.requestType,
      providerMode: aiRequestLogs.providerMode,
    })
  return row
}

// Sent once per week, on the request that reaches 80% of the allowance.
async function warnWhenQuotaLow(userId: string, email: string) {
  const { start, resetAt } = aiAllowanceWeek()
  const usage = await requireCloudflareRuntime()
    .bindings.DB.prepare(
      'select u.requests as used, a.ai_weekly_limit as "limit" from ai_weekly_usage u join auth_users a on a.id=u.user_id where u.user_id=? and u.week_start=?',
    )
    .bind(userId, start.getTime())
    .first<{ used: number; limit: number }>()
  if (usage && usage.used === Math.ceil(usage.limit * 0.8))
    await notifyUser(email, '/settings/ai', {
      kind: 'ai-quota-low',
      ...usage,
      resetAt,
    })
}
