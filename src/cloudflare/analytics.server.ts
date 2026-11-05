import '@tanstack/react-start/server-only'
import { requireIdentity } from '@/db/journal-context.server'
import { getServerEnv } from '@/lib/env.server'
import { MCP_TOOL_CATALOG } from '@/lib/mcp/catalog'
import type { AnalyticsEvent } from '../extension-points/analytics.server'
import { getCloudflareRuntime } from './context.server'
import { getHostedEnv } from './hosted-env.server'

export const ANALYTICS_CONSENT_COOKIE = 'roastbook_analytics'
const ingestHost = 'https://eu.i.posthog.com'
const assetHost = 'https://eu-assets.i.posthog.com'
type Attributes = Record<string, string | number | boolean>

function consented() {
  return (getCloudflareRuntime()?.request?.headers.get('cookie') ?? '')
    .split(';')
    .some((part) => part.trim() === `${ANALYTICS_CONSENT_COOKIE}=granted`)
}

// Telemetry must work wherever it is called, including outside a valid environment.
function setting<T>(read: () => T) {
  try {
    return read()
  } catch {
    return undefined
  }
}
const release = () =>
  setting(() => getServerEnv().ROASTBOOK_SOURCE_REVISION) ?? 'unknown'

/** Delivers in the background with a timeout; telemetry never fails or slows the request. */
function send(path: string, kind: string, body: (token: string) => unknown) {
  const token = setting(() => getHostedEnv().POSTHOG_PROJECT_TOKEN)
  if (!token) return
  const sent = fetch(`${ingestHost}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body(token)),
    signal: AbortSignal.timeout(5_000),
  })
    .then(async (response) => {
      await response.body?.cancel()
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    })
    // Plain console only: logging this through PostHog could loop.
    .catch(() => console.error(JSON.stringify({ event: 'telemetry_failed', kind })))
  getCloudflareRuntime()?.waitUntil?.(sent)
}

/** A null distinct ID sends an anonymous event without a person profile. */
function capture(event: string, distinctId: string | null, properties: object) {
  send('/i/v0/e/', 'capture', (token) => ({
    api_key: token,
    event,
    distinct_id: distinctId ?? crypto.randomUUID(),
    properties: {
      ...properties,
      release: release(),
      $process_person_profile: distinctId !== null,
    },
  }))
}

/** Captures only with the user's analytics consent. */
export function captureEvent(
  distinctId: string,
  event: AnalyticsEvent | 'user_signed_up',
  properties: object = {},
) {
  if (consented()) capture(event, distinctId, properties)
}

export function trackEvent(event: AnalyticsEvent) {
  const identity = requireIdentity()
  if (identity.authentication) captureEvent(identity.id, event)
}

/** One `$ai_generation` per AI request log, metadata only: never prompts, outputs or raw errors.
 *  PostHog prices it from the model and token counts; that is the only cost record.
 *  Provided AI is always sent (cost tracking under the Terms of Service); BYOAI only with consent. */
export function captureAiGeneration(generation: {
  requestType: string
  providerMode: string
  model: string
  status: string
  durationMs: number
  promptTokens: number
  cachedPromptTokens: number
  completionTokens: number
}) {
  const identity = requireIdentity()
  if (!identity.authentication) return
  if (generation.providerMode !== 'provided' && !consented()) return
  capture('$ai_generation', identity.id, {
    // shortcut: one trace per request log; pass a conversation ID once follow-ups persist one.
    $ai_trace_id: crypto.randomUUID(),
    $ai_span_name: generation.requestType,
    $ai_model: generation.model,
    $ai_input_tokens: generation.promptTokens,
    $ai_cache_read_input_tokens: generation.cachedPromptTokens,
    // OpenAI-compatible usage counts cached tokens inside the input tokens.
    $ai_cache_reporting_exclusive: false,
    $ai_output_tokens: generation.completionTokens,
    $ai_latency: generation.durationMs / 1_000,
    $ai_is_error: generation.status !== 'succeeded',
    ...(generation.status === 'succeeded' ? {} : { $ai_error: generation.status }),
    status: generation.status,
    provider_mode: generation.providerMode,
  })
}

const mcpTools = new Set<string>(MCP_TOOL_CATALOG.map((tool) => tool.name))

/** Runs an MCP request and records tool calls as anonymous `$mcp_tool_call`
 *  events: tool name, duration and outcome only, never arguments or results. */
export async function observeMcpRequest(
  request: Request,
  handle: (request: Request) => Response | Promise<Response>,
) {
  const call = (await request
    .clone()
    .json()
    .catch(() => null)) as { method?: unknown; params?: { name?: unknown } } | null
  const tool = call?.method === 'tools/call' ? call.params?.name : undefined
  if (typeof tool !== 'string' || !mcpTools.has(tool)) return handle(request)
  const started = Date.now()
  const response = await handle(request)
  const durationMs = Date.now() - started
  const recorded = response
    .clone()
    .text()
    .then((body) => {
      // Matches only top-level JSON keys: quotes inside tool output are escaped.
      const failed = !response.ok || /"(isError"\s*:\s*true|error"\s*:\s*\{)/.test(body)
      capture('$mcp_tool_call', null, {
        $mcp_tool_name: tool,
        $mcp_resource_name: tool,
        $mcp_server_name: 'roastbook',
        $mcp_interface: 'mcp',
        $mcp_duration_ms: durationMs,
        $mcp_is_error: failed,
      })
    })
    .catch(() => undefined)
  getCloudflareRuntime()?.waitUntil?.(recorded)
  return response
}

/** Anonymous `$exception` for a request the Worker could not serve: type and a short message. */
export function captureServerException(error: unknown) {
  const type = error instanceof Error ? error.name : 'Error'
  const value = (error instanceof Error ? error.message : String(error))
    .replace(/\n[\s\S]*/, '')
    .slice(0, 200)
  capture('$exception', null, {
    $exception_list: [
      { type, value, mechanism: { handled: true, synthetic: false } },
    ],
    $exception_level: 'error',
  })
}

const otlpAttributes = (attributes: Attributes) =>
  Object.entries(attributes).map(([key, value]) => ({
    key,
    value:
      typeof value === 'string'
        ? { stringValue: value }
        : typeof value === 'boolean'
          ? { boolValue: value }
          : { doubleValue: value },
  }))
const resource = () => ({
  attributes: otlpAttributes({
    'service.name': 'roastbook',
    'service.version': release(),
  }),
})
const nanos = (ms: number) => `${ms}000000`

/** Structured operational log: the console, plus PostHog Logs over OTLP.
 *  Attributes must be identifiers and counts, never user content. */
export function logEvent(
  level: 'warn' | 'error',
  event: string,
  attributes: Attributes = {},
) {
  console.error(JSON.stringify({ event, ...attributes }))
  send('/i/v1/logs', 'logs', () => ({
    resourceLogs: [
      {
        resource: resource(),
        scopeLogs: [
          {
            scope: { name: 'roastbook' },
            logRecords: [
              {
                timeUnixNano: nanos(Date.now()),
                severityText: level.toUpperCase(),
                severityNumber: level === 'error' ? 17 : 13,
                body: { stringValue: event },
                attributes: otlpAttributes(attributes),
              },
            ],
          },
        ],
      },
    ],
  }))
}

const durationBounds = [50, 100, 250, 500, 1_000, 2_500, 5_000]

/** Request count and latency to PostHog Metrics, labelled only by method and status class.
 *  shortcut: one export per request since Workers share no aggregator; batch through a
 *  Durable Object or Workers Analytics Engine if traffic grows past the free allowance. */
export function recordRequestMetric(
  method: string,
  status: number,
  durationMs: number,
) {
  const now = Date.now()
  const bucket = [...durationBounds, Infinity].findIndex((b) => durationMs <= b)
  const point = {
    startTimeUnixNano: nanos(now - durationMs),
    timeUnixNano: nanos(now),
    attributes: otlpAttributes({
      'http.request.method': ['GET', 'POST'].includes(method) ? method : 'OTHER',
      'http.response.status_class': `${Math.floor(status / 100)}xx`,
    }),
  }
  send('/i/v1/metrics', 'metrics', () => ({
    resourceMetrics: [
      {
        resource: resource(),
        scopeMetrics: [
          {
            scope: { name: 'roastbook' },
            metrics: [
              {
                name: 'http.server.requests',
                unit: '1',
                sum: {
                  aggregationTemporality: 1,
                  isMonotonic: true,
                  dataPoints: [{ ...point, asInt: '1' }],
                },
              },
              {
                name: 'http.server.duration',
                unit: 'ms',
                histogram: {
                  aggregationTemporality: 1,
                  dataPoints: [
                    {
                      ...point,
                      count: '1',
                      sum: durationMs,
                      explicitBounds: durationBounds,
                      bucketCounts: [...durationBounds, Infinity].map(
                        (_, i) => (i === bucket ? '1' : '0'),
                      ),
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  }))
}

/** AI spend as priced by PostHog, by provider mode, model and user. Null when the query
 *  key is missing or PostHog is unreachable, so the admin report still loads. */
export async function loadAiCosts(days: number, includeByo: boolean) {
  const { POSTHOG_PROJECT_ID: project, POSTHOG_PERSONAL_API_KEY: token } =
    getHostedEnv()
  if (!project || !token || !Number.isInteger(days)) return null
  try {
    const response = await fetch(
      `https://eu.posthog.com/api/projects/${encodeURIComponent(project)}/query/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            kind: 'HogQLQuery',
            query: `select properties.provider_mode, properties.$ai_model, distinct_id,
              sum(toFloat(properties.$ai_total_cost_usd))
              from events where event = '$ai_generation'
              and timestamp >= now() - toIntervalDay(${days})
              ${includeByo ? '' : "and properties.provider_mode = 'provided'"}
              group by 1, 2, 3 limit 10000`,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const { results } = (await response.json()) as {
      results: [string, string, string, number | null][]
    }
    const costs = {
      totalUsd: 0,
      byProvider: {} as Record<string, number>,
      byModel: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
    }
    for (const [provider, model, user, usd] of results) {
      costs.totalUsd += usd ?? 0
      costs.byProvider[provider] = (costs.byProvider[provider] ?? 0) + (usd ?? 0)
      costs.byModel[model] = (costs.byModel[model] ?? 0) + (usd ?? 0)
      costs.byUser[user] = (costs.byUser[user] ?? 0) + (usd ?? 0)
    }
    return costs
  } catch {
    logEvent('warn', 'ai_cost_query_failed')
    return null
  }
}

/** Removes the person, events and recordings. Throws so the deletion job retries. */
export async function deleteAnalyticsPerson(distinctId: string) {
  const { POSTHOG_PROJECT_ID: project, POSTHOG_PERSONAL_API_KEY: token } =
    getHostedEnv()
  if (!project || !token) return
  const response = await fetch(
    `https://eu.posthog.com/api/projects/${encodeURIComponent(project)}/persons/bulk_delete/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        distinct_ids: [distinctId],
        delete_events: true,
        delete_recordings: true,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  )
  await response.body?.cancel()
  if (!response.ok) throw new Error('Analytics deletion failed')
}

/** First-party proxy so the browser SDK talks only to our origin. */
export async function proxyAnalytics(request: Request) {
  const url = new URL(request.url)
  const path = url.pathname.slice('/ingest'.length)
  // Set the path on a fixed origin: resolving `//host/x` against a base would switch hosts.
  const target = new URL(path.startsWith('/static/') ? assetHost : ingestHost)
  target.pathname = path
  target.search = url.search
  const headers = new Headers()
  for (const name of ['content-type', 'content-encoding', 'user-agent'])
    if (request.headers.has(name))
      headers.set(name, request.headers.get(name) as string)
  // Never forward app cookies or the client IP to PostHog.
  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  })
}
