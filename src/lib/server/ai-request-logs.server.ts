import type { ChatMiddleware, StreamChunk, TokenUsage } from '@tanstack/ai'
import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { aiRequestLogs } from '@/db/schema'
import { estimateTokenCostUsd } from '@/lib/ai-pricing'
import {
  type AiTokenTotals,
  addAiTokenUsage,
  EMPTY_AI_TOKEN_TOTALS,
} from '@/lib/ai-token-usage'
import type { JsonValue } from '@/lib/json-value'
import {
  getAiTelemetryPolicy,
  REDACTED_AI_PAYLOAD,
  storedAiErrorMessage,
  storedAiPayload,
} from '@/lib/server/ai-request-log-policy.server'

export type AiRequestStatus = 'in_progress' | 'succeeded' | 'failed' | 'aborted'

export type AiRequestLogSummary = {
  id: number
  requestType: string
  model: string
  status: AiRequestStatus
  errorMessage: string | null
  promptTokens: number
  cachedPromptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: string | null
  durationMs: number | null
  completedAt: Date | null
  createdAt: Date
}

export type AiRequestLogEntry = AiRequestLogSummary & {
  requestPayload: JsonValue
  responsePayload: JsonValue | null
}

export type AiRequestLogPage = {
  items: Array<AiRequestLogSummary>
  nextCursor: number | null
}

export type AiRequestStats = {
  requestCount: number
  promptTokens: number
  cachedPromptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: string
  pricedTokens: number
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

function errorPayload(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }
  return { message: errorMessage(error) }
}

function isAiRequestStatus(value: string): value is AiRequestStatus {
  return (
    value === 'in_progress' ||
    value === 'succeeded' ||
    value === 'failed' ||
    value === 'aborted'
  )
}

function aiRequestStatus(value: string): AiRequestStatus {
  if (!isAiRequestStatus(value)) {
    throw new Error(`Unknown AI request status: ${value}`)
  }
  return value
}

async function updateLogSafely(
  id: number | undefined,
  values: Partial<typeof aiRequestLogs.$inferInsert>,
) {
  if (id === undefined) return
  try {
    await db.update(aiRequestLogs).set(values).where(eq(aiRequestLogs.id, id))
  } catch (error) {
    console.error('Could not update AI request log', error)
  }
}

export async function scrubExpiredAiRequestPayloads({
  force = false,
  policy = getAiTelemetryPolicy(),
  now = new Date(),
}: {
  force?: boolean
  policy?: ReturnType<typeof getAiTelemetryPolicy>
  now?: Date
} = {}): Promise<number> {
  const hasDetailedPayload = sql<boolean>`(
    ${aiRequestLogs.requestPayload} <> ${JSON.stringify(REDACTED_AI_PAYLOAD)}::jsonb
    or ${aiRequestLogs.responsePayload} is not null
    or ${aiRequestLogs.errorMessage} is not null
  )`
  const retentionCutoff = new Date(
    now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1_000,
  )
  const rows = await db
    .update(aiRequestLogs)
    .set({
      requestPayload: REDACTED_AI_PAYLOAD,
      responsePayload: null,
      errorMessage: null,
    })
    .where(
      force || !policy.storePayloads
        ? hasDetailedPayload
        : and(lt(aiRequestLogs.createdAt, retentionCutoff), hasDetailedPayload),
    )
    .returning({ id: aiRequestLogs.id })
  return rows.length
}

export async function purgeAiRequestLogPayloads(): Promise<number> {
  return scrubExpiredAiRequestPayloads({ force: true })
}

export async function startAiRequestLog({
  requestType,
  model,
  requestPayload,
}: {
  requestType: string
  model: string
  requestPayload: unknown
}): Promise<number | undefined> {
  try {
    await scrubExpiredAiRequestPayloads()
    const policy = getAiTelemetryPolicy()
    const [entry] = await db
      .insert(aiRequestLogs)
      .values({
        requestType,
        model,
        requestPayload: storedAiPayload(requestPayload, policy),
      })
      .returning({ id: aiRequestLogs.id })
    return entry?.id
  } catch (error) {
    console.error('Could not start AI request log', error)
    return undefined
  }
}

export async function completeAiRequestLog({
  logId,
  model,
  responsePayload,
  usage = EMPTY_AI_TOKEN_TOTALS,
  durationMs,
}: {
  logId: number | undefined
  model: string
  responsePayload: unknown
  usage?: AiTokenTotals
  durationMs: number
}) {
  const policy = getAiTelemetryPolicy()
  await updateLogSafely(logId, {
    status: 'succeeded',
    responsePayload: policy.storePayloads
      ? storedAiPayload(responsePayload, policy)
      : null,
    ...usageValues(model, usage),
    durationMs,
    completedAt: new Date(),
  })
}

export async function failAiRequestLog({
  logId,
  model,
  error,
  durationMs,
}: {
  logId: number | undefined
  model: string
  error: unknown
  durationMs: number
}) {
  const policy = getAiTelemetryPolicy()
  await updateLogSafely(logId, {
    status: 'failed',
    responsePayload: policy.storePayloads
      ? storedAiPayload({ error: errorPayload(error) }, policy)
      : null,
    errorMessage: storedAiErrorMessage(errorMessage(error), policy),
    ...usageValues(model, EMPTY_AI_TOKEN_TOTALS),
    durationMs,
    completedAt: new Date(),
  })
}

function usageForResponse(
  accumulated: AiTokenTotals,
  finalUsage: TokenUsage | undefined,
): AiTokenTotals {
  if (accumulated.totalTokens > 0 || !finalUsage) return accumulated
  return addAiTokenUsage(EMPTY_AI_TOKEN_TOTALS, finalUsage)
}

function usageValues(model: string, usage: AiTokenTotals) {
  const estimatedCost = estimateTokenCostUsd(model, usage)
  return {
    promptTokens: usage.promptTokens,
    cachedPromptTokens: usage.promptTokensDetails?.cachedTokens ?? 0,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: estimatedCost === null ? null : estimatedCost.toFixed(10),
  }
}

export function createAiRequestLogMiddleware(
  logId: number | undefined,
  model: string,
): ChatMiddleware {
  const policy = getAiTelemetryPolicy()
  const events: Array<StreamChunk> = []
  let usage = EMPTY_AI_TOKEN_TOTALS

  return {
    name: 'roastbook-ai-request-log',
    onChunk: (_context, chunk) => {
      if (policy.storePayloads) events.push(chunk)
    },
    onUsage: (_context, nextUsage) => {
      usage = addAiTokenUsage(usage, nextUsage)
    },
    onFinish: async (_context, info) => {
      const totals = usageForResponse(usage, info.usage)
      await updateLogSafely(logId, {
        status: 'succeeded',
        responsePayload: policy.storePayloads
          ? storedAiPayload(
              {
                content: info.content,
                finishReason: info.finishReason,
                events,
                usage: totals,
              },
              policy,
            )
          : null,
        ...usageValues(model, totals),
        durationMs: info.duration,
        completedAt: new Date(),
      })
    },
    onAbort: async (_context, info) => {
      await updateLogSafely(logId, {
        status: 'aborted',
        responsePayload: policy.storePayloads
          ? storedAiPayload({ events, reason: info.reason ?? null }, policy)
          : null,
        errorMessage: policy.storePayloads
          ? storedAiErrorMessage(info.reason ?? 'Request aborted', policy)
          : 'AI request aborted',
        ...usageValues(model, usage),
        durationMs: info.duration,
        completedAt: new Date(),
      })
    },
    onError: async (_context, info) => {
      await updateLogSafely(logId, {
        status: 'failed',
        responsePayload: policy.storePayloads
          ? storedAiPayload({ events, error: errorPayload(info.error) }, policy)
          : null,
        errorMessage: storedAiErrorMessage(errorMessage(info.error), policy),
        ...usageValues(model, usage),
        durationMs: info.duration,
        completedAt: new Date(),
      })
    },
  }
}

export async function loadAiRequestStats(): Promise<AiRequestStats> {
  await scrubExpiredAiRequestPayloads()
  const [stats] = await db
    .select({
      requestCount: sql<number>`count(*)::double precision`,
      promptTokens: sql<number>`coalesce(sum(${aiRequestLogs.promptTokens}), 0)::double precision`,
      cachedPromptTokens: sql<number>`coalesce(sum(${aiRequestLogs.cachedPromptTokens}), 0)::double precision`,
      completionTokens: sql<number>`coalesce(sum(${aiRequestLogs.completionTokens}), 0)::double precision`,
      totalTokens: sql<number>`coalesce(sum(${aiRequestLogs.totalTokens}), 0)::double precision`,
      estimatedCostUsd: sql<string>`coalesce(sum(${aiRequestLogs.estimatedCostUsd}), 0)::text`,
      pricedTokens: sql<number>`coalesce(sum(${aiRequestLogs.totalTokens}) filter (where ${aiRequestLogs.estimatedCostUsd} is not null), 0)::double precision`,
    })
    .from(aiRequestLogs)

  return (
    stats ?? {
      requestCount: 0,
      promptTokens: 0,
      cachedPromptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: '0',
      pricedTokens: 0,
    }
  )
}

export async function loadAiRequestLogs({
  cursor,
  limit,
}: {
  cursor?: number
  limit: number
}): Promise<AiRequestLogPage> {
  await scrubExpiredAiRequestPayloads()
  const rows = await db
    .select({
      id: aiRequestLogs.id,
      requestType: aiRequestLogs.requestType,
      model: aiRequestLogs.model,
      status: aiRequestLogs.status,
      errorMessage: aiRequestLogs.errorMessage,
      promptTokens: aiRequestLogs.promptTokens,
      cachedPromptTokens: aiRequestLogs.cachedPromptTokens,
      completionTokens: aiRequestLogs.completionTokens,
      totalTokens: aiRequestLogs.totalTokens,
      estimatedCostUsd: aiRequestLogs.estimatedCostUsd,
      durationMs: aiRequestLogs.durationMs,
      completedAt: aiRequestLogs.completedAt,
      createdAt: aiRequestLogs.createdAt,
    })
    .from(aiRequestLogs)
    .where(cursor === undefined ? undefined : lt(aiRequestLogs.id, cursor))
    .orderBy(desc(aiRequestLogs.id))
    .limit(limit + 1)
  const pageRows = rows.slice(0, limit)
  const items = pageRows.map(
    (row): AiRequestLogSummary => ({
      ...row,
      status: aiRequestStatus(row.status),
    }),
  )

  return {
    items,
    nextCursor:
      rows.length > limit ? (items[items.length - 1]?.id ?? null) : null,
  }
}

export async function loadAiRequestLog(id: number): Promise<AiRequestLogEntry> {
  await scrubExpiredAiRequestPayloads()
  const entry = await db.query.aiRequestLogs.findFirst({
    where: eq(aiRequestLogs.id, id),
  })
  if (!entry) throw new Error('AI request log not found')

  return { ...entry, status: aiRequestStatus(entry.status) }
}
