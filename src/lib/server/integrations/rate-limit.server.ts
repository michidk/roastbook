import '@tanstack/react-start/server-only'
import { randomUUID } from 'node:crypto'
import { inArray, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { authRateLimits } from '@/db/schema'
import { getServerEnv } from '@/lib/env.server'
import type { IntegrationRateLimit } from '@/modules/integrations/rate-limit'

const WINDOWS = [
  { name: 'minute', milliseconds: 60_000 },
  { name: 'day', milliseconds: 86_400_000 },
] as const

function limits() {
  const env = getServerEnv()
  return {
    minute: env.INTEGRATION_RATE_LIMIT_PER_MINUTE,
    day: env.INTEGRATION_RATE_LIMIT_PER_DAY,
  }
}

const windowStart = (milliseconds: number, now: number) =>
  Math.floor(now / milliseconds) * milliseconds
const accountKey = (userId: string, window: string) =>
  `integration:user:${userId}:${window}`
const credentialKey = (credentialId: string) =>
  `integration:credential:${credentialId}:day`

/** Counts one request in a fixed window and returns the new total. */
async function hit(key: string, start: number) {
  const [row] = await getControlDb()
    .insert(authRateLimits)
    .values({ id: randomUUID(), key, count: 1, lastRequest: start })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        count: sql`case when ${authRateLimits.lastRequest} < ${start} then 1 else ${authRateLimits.count} + 1 end`,
        lastRequest: start,
      },
    })
    .returning({ count: authRateLimits.count })
  return row?.count ?? 0
}

async function peek(keys: readonly { key: string; start: number }[]) {
  if (!keys.length) return new Map<string, number>()
  const rows = await getControlDb()
    .select({
      key: authRateLimits.key,
      count: authRateLimits.count,
      lastRequest: authRateLimits.lastRequest,
    })
    .from(authRateLimits)
    .where(
      inArray(
        authRateLimits.key,
        keys.map((entry) => entry.key),
      ),
    )
  const starts = new Map(keys.map((entry) => [entry.key, entry.start]))
  return new Map(
    rows.map((row) => [
      row.key,
      row.lastRequest < (starts.get(row.key) ?? 0) ? 0 : row.count,
    ]),
  )
}

function describe(counts: Record<'minute' | 'day', number>, now: number) {
  const configured = limits()
  return WINDOWS.map(({ name, milliseconds }) => {
    const limit = configured[name]
    const used = counts[name]
    return {
      window: name,
      limit,
      used: Math.min(used, limit),
      remaining: Math.max(0, limit - used),
      resetAt: new Date(
        windowStart(milliseconds, now) + milliseconds,
      ).toISOString(),
    }
  }) satisfies IntegrationRateLimit['windows']
}

/**
 * Counts one API or MCP request against the account's shared allowance, so
 * extra keys cannot raise the limit, and against the credential's daily
 * usage shown in Settings.
 */
export async function consumeIntegrationRequest(
  userId: string,
  credentialId: string,
): Promise<IntegrationRateLimit> {
  const now = Date.now()
  const [minute, day] = await Promise.all(
    WINDOWS.map(({ name, milliseconds }) =>
      hit(accountKey(userId, name), windowStart(milliseconds, now)),
    ),
  )
  await hit(credentialKey(credentialId), windowStart(86_400_000, now))
  const configured = limits()
  return {
    allowed: (minute ?? 0) <= configured.minute && (day ?? 0) <= configured.day,
    windows: describe({ minute: minute ?? 0, day: day ?? 0 }, now),
  }
}

/** Current usage without counting a request. */
export async function loadIntegrationUsage(
  userId: string,
  credentialIds: readonly string[],
) {
  const now = Date.now()
  const dayStart = windowStart(86_400_000, now)
  const counts = await peek([
    ...WINDOWS.map(({ name, milliseconds }) => ({
      key: accountKey(userId, name),
      start: windowStart(milliseconds, now),
    })),
    ...credentialIds.map((id) => ({ key: credentialKey(id), start: dayStart })),
  ])
  const account = describe(
    {
      minute: counts.get(accountKey(userId, 'minute')) ?? 0,
      day: counts.get(accountKey(userId, 'day')) ?? 0,
    },
    now,
  )
  return {
    account: {
      allowed: account.every((window) => window.remaining > 0),
      windows: account,
    } satisfies IntegrationRateLimit,
    requestsToday: Object.fromEntries(
      credentialIds.map((id) => [id, counts.get(credentialKey(id)) ?? 0]),
    ) as Record<string, number>,
  }
}

export async function forgetCredentialUsage(credentialId: string) {
  await getControlDb()
    .delete(authRateLimits)
    .where(inArray(authRateLimits.key, [credentialKey(credentialId)]))
}

/**
 * IETF RateLimit headers (draft-ietf-httpapi-ratelimit-headers) plus the
 * widespread X-RateLimit-* trio for the window that runs out first.
 */
export function rateLimitHeaders(state: IntegrationRateLimit) {
  const headers = new Headers()
  headers.set(
    'RateLimit-Policy',
    state.windows
      .map(
        (window) =>
          `"${window.window}";q=${window.limit};w=${window.window === 'minute' ? 60 : 86_400}`,
      )
      .join(', '),
  )
  const now = Date.now()
  const seconds = (resetAt: string) =>
    Math.max(0, Math.ceil((Date.parse(resetAt) - now) / 1000))
  headers.set(
    'RateLimit',
    state.windows
      .map(
        (window) =>
          `"${window.window}";r=${window.remaining};t=${seconds(window.resetAt)}`,
      )
      .join(', '),
  )
  const tightest = [...state.windows].sort(
    (left, right) =>
      left.remaining - right.remaining ||
      Date.parse(right.resetAt) - Date.parse(left.resetAt),
  )[0]
  if (tightest) {
    headers.set('X-RateLimit-Limit', String(tightest.limit))
    headers.set('X-RateLimit-Remaining', String(tightest.remaining))
    headers.set(
      'X-RateLimit-Reset',
      String(Math.ceil(Date.parse(tightest.resetAt) / 1000)),
    )
    if (!state.allowed)
      headers.set('Retry-After', String(seconds(tightest.resetAt)))
  }
  return headers
}

export function rateLimitedResponse(state: IntegrationRateLimit) {
  const headers = rateLimitHeaders(state)
  headers.set('Cache-Control', 'no-store')
  return Response.json(
    {
      error: {
        code: 'rate_limited',
        message:
          'Too many requests. Wait until the limit resets, then try again.',
      },
      rateLimit: state,
    },
    { status: 429, headers },
  )
}
