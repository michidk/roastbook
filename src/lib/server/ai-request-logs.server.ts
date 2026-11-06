import { desc, eq, lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { requireIdentity } from '@/db/journal-context.server'
import { owned } from '@/db/journal-scope.server'
import { aiRequestLogs } from '@/db/schema'
import type { AiRequestStart } from '@/extension-points/ai-request-recorder.server'
import { type AiTokenTotals, EMPTY_AI_TOKEN_TOTALS } from '@/lib/ai-token-usage'
import { DEMO_MODE } from '@/lib/build-mode'
import type { JsonValue } from '@/lib/json-value'
import {
  startAiAccounting,
  updateAiAccounting,
} from '@/lib/server/ai-request-accounting.server'
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
    await updateAiAccounting(id, values)
  } catch (error) {
    console.error('Could not update AI request log', error)
  }
}

// Redacts stored payloads once storing them is turned off, or on request.
export async function scrubAiRequestPayloads({
  force = false,
  policy,
}: {
  force?: boolean
  policy?: ReturnType<typeof getAiTelemetryPolicy>
} = {}): Promise<number> {
  if (DEMO_MODE) return 0
  if (!force && (policy ?? getAiTelemetryPolicy()).storePayloads) return 0

  const hasDetailedPayload = sql<boolean>`(
    ${aiRequestLogs.requestPayload} <> ${sql.param(REDACTED_AI_PAYLOAD, aiRequestLogs.requestPayload)}
    or ${aiRequestLogs.responsePayload} is not null
    or ${aiRequestLogs.errorMessage} is not null
  )`
  const rows = await db
    .update(aiRequestLogs)
    .set({
      requestPayload: REDACTED_AI_PAYLOAD,
      responsePayload: null,
      errorMessage: null,
    })
    .where(owned(aiRequestLogs, hasDetailedPayload))
    .returning({ id: aiRequestLogs.id })
  return rows.length
}

export async function purgeAiRequestLogPayloads(): Promise<number> {
  return scrubAiRequestPayloads({ force: true })
}

export async function startAiRequestLog({
  requestType,
  model,
  requestPayload,
}: AiRequestStart): Promise<number> {
  const policy = getAiTelemetryPolicy()
  return startAiAccounting({
    ownerId: requireIdentity().id,
    requestType,
    model,
    requestPayload: storedAiPayload(requestPayload, policy),
  })
}

export async function completeAiRequestLog({
  logId,
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
    ...usageValues(usage),
    durationMs,
    completedAt: new Date(),
  })
}

export async function failAiRequestLog({
  logId,
  error,
  durationMs,
  usage = EMPTY_AI_TOKEN_TOTALS,
  aborted = false,
}: {
  logId: number | undefined
  model: string
  error: unknown
  durationMs: number
  usage?: AiTokenTotals
  aborted?: boolean
}) {
  const policy = getAiTelemetryPolicy()
  await updateLogSafely(logId, {
    status: aborted ? 'aborted' : 'failed',
    responsePayload: policy.storePayloads
      ? storedAiPayload({ error: errorPayload(error) }, policy)
      : null,
    errorMessage: storedAiErrorMessage(errorMessage(error), policy),
    ...usageValues(usage),
    durationMs,
    completedAt: new Date(),
  })
}

function usageValues(usage: AiTokenTotals) {
  return {
    promptTokens: usage.promptTokens,
    cachedPromptTokens: usage.promptTokensDetails?.cachedTokens ?? 0,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
  }
}

export const aiRequestStatsSelection = {
  requestCount: sql<number>`cast(count(*) as double precision)`,
  promptTokens: sql<number>`cast(coalesce(sum(${aiRequestLogs.promptTokens}), 0) as double precision)`,
  cachedPromptTokens: sql<number>`cast(coalesce(sum(${aiRequestLogs.cachedPromptTokens}), 0) as double precision)`,
  completionTokens: sql<number>`cast(coalesce(sum(${aiRequestLogs.completionTokens}), 0) as double precision)`,
  totalTokens: sql<number>`cast(coalesce(sum(${aiRequestLogs.totalTokens}), 0) as double precision)`,
}

export async function loadAiRequestStats(): Promise<AiRequestStats> {
  await scrubAiRequestPayloads()
  const [stats] = await db
    .select(aiRequestStatsSelection)
    .from(aiRequestLogs)
    .where(owned(aiRequestLogs))

  return (
    stats ?? {
      requestCount: 0,
      promptTokens: 0,
      cachedPromptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
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
  await scrubAiRequestPayloads()
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
      durationMs: aiRequestLogs.durationMs,
      completedAt: aiRequestLogs.completedAt,
      createdAt: aiRequestLogs.createdAt,
    })
    .from(aiRequestLogs)
    .where(
      owned(
        aiRequestLogs,
        cursor === undefined ? undefined : lt(aiRequestLogs.id, cursor),
      ),
    )
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
  await scrubAiRequestPayloads()
  const entry = await db.query.aiRequestLogs.findFirst({
    where: owned(aiRequestLogs, eq(aiRequestLogs.id, id)),
  })
  if (!entry) throw new Error('AI request log not found')

  return { ...entry, status: aiRequestStatus(entry.status) }
}
