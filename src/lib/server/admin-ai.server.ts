import '@tanstack/react-start/server-only'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { getAiControlDb } from '@/db/connection.server'
import { aiRequestLogs, authUsers } from '@/db/schema'
import { providedAiConfig } from './ai-allowance.server'
import { aiRequestStatsSelection } from './ai-request-logs.server'
import { requireAdmin } from './auth/account.server'

export async function loadAdminAiReport({
  includeByo,
  days,
  cursor,
}: {
  includeByo: boolean
  days: number
  cursor?: number
}) {
  requireAdmin()
  if (!providedAiConfig()) throw new Error('Provided AI is unavailable')
  const database = getAiControlDb()
  const since = new Date(Date.now() - days * 86400_000)
  const filter = and(
    gte(aiRequestLogs.createdAt, since),
    includeByo ? undefined : eq(aiRequestLogs.providerMode, 'provided'),
  )
  const [totals, byProvider, byModel, byUser, daily, logs] = await Promise.all([
    database
      .select({
        ...aiRequestStatsSelection,
        unpricedRequests: sql<number>`count(*) filter (where ${aiRequestLogs.estimatedCostUsd} is null)::int`,
      })
      .from(aiRequestLogs)
      .where(filter),
    database
      .select({
        providerMode: aiRequestLogs.providerMode,
        ...aiRequestStatsSelection,
      })
      .from(aiRequestLogs)
      .where(filter)
      .groupBy(aiRequestLogs.providerMode),
    database
      .select({ model: aiRequestLogs.model, ...aiRequestStatsSelection })
      .from(aiRequestLogs)
      .where(filter)
      .groupBy(aiRequestLogs.model)
      .orderBy(sql`sum(${aiRequestLogs.totalTokens}) desc`)
      .limit(50),
    database
      .select({
        userId: aiRequestLogs.ownerId,
        email: authUsers.email,
        ...aiRequestStatsSelection,
      })
      .from(aiRequestLogs)
      .leftJoin(authUsers, eq(authUsers.id, aiRequestLogs.ownerId))
      .where(filter)
      .groupBy(aiRequestLogs.ownerId, authUsers.email)
      .orderBy(sql`sum(${aiRequestLogs.totalTokens}) desc`)
      .limit(50),
    database
      .select({
        date: sql<string>`to_char(${aiRequestLogs.createdAt}, 'YYYY-MM-DD')`,
        ...aiRequestStatsSelection,
      })
      .from(aiRequestLogs)
      .where(filter)
      .groupBy(sql`to_char(${aiRequestLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${aiRequestLogs.createdAt}, 'YYYY-MM-DD')`),
    database
      .select({
        id: aiRequestLogs.id,
        email: authUsers.email,
        providerMode: aiRequestLogs.providerMode,
        requestType: aiRequestLogs.requestType,
        model: aiRequestLogs.model,
        status: aiRequestLogs.status,
        promptTokens: aiRequestLogs.promptTokens,
        completionTokens: aiRequestLogs.completionTokens,
        totalTokens: aiRequestLogs.totalTokens,
        estimatedCostUsd: aiRequestLogs.estimatedCostUsd,
        createdAt: aiRequestLogs.createdAt,
      })
      .from(aiRequestLogs)
      .leftJoin(authUsers, eq(authUsers.id, aiRequestLogs.ownerId))
      .where(and(filter, cursor ? lt(aiRequestLogs.id, cursor) : undefined))
      .orderBy(desc(aiRequestLogs.id))
      .limit(51),
  ])
  const summary = totals[0]
  if (!summary) throw new Error('Could not load AI totals')
  return {
    summary,
    byProvider,
    byModel,
    byUser,
    daily,
    logs: logs.slice(0, 50),
    nextCursor: logs.length > 50 ? (logs[49]?.id ?? null) : null,
    since,
  }
}
