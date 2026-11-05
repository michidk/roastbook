import { afterEach, expect, test } from 'bun:test'

const {
  loadAiCosts,
  observeMcpRequest,
  proxyAnalytics,
  recordRequestMetric,
} = await import(
  './analytics.server'
)
const { withCloudflareRuntime } = await import('./context.server')
const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
})

test('proxies to PostHog EU without cookies or client IP', async () => {
  let forwarded: Request | undefined
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    forwarded = new Request(input, init)
    return new Response('ok')
  }) as typeof fetch
  await proxyAnalytics(
    new Request('https://app.roastbook.coffee/ingest/e/?v=1', {
      method: 'POST',
      body: '{}',
      headers: {
        cookie: 'better-auth.session_token=secret',
        'x-real-ip': '203.0.113.9',
        'content-type': 'application/json',
      },
    }),
  )
  expect(forwarded?.url).toBe('https://eu.i.posthog.com/e/?v=1')
  expect(forwarded?.headers.get('cookie')).toBeNull()
  expect(forwarded?.headers.get('x-real-ip')).toBeNull()
  expect(forwarded?.headers.get('content-type')).toBe('application/json')
})

test('serves SDK assets from the EU asset host', async () => {
  let target = ''
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    target = String(input)
    return new Response('ok')
  }) as typeof fetch
  await proxyAnalytics(
    new Request('https://app.roastbook.coffee/ingest/static/recorder.js'),
  )
  expect(target).toBe('https://eu-assets.i.posthog.com/static/recorder.js')
})

test('keeps the PostHog host for protocol-relative paths', async () => {
  let target = ''
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    target = String(input)
    return new Response('ok')
  }) as typeof fetch
  await proxyAnalytics(
    new Request('https://app.roastbook.coffee/ingest//example.org/x?y=1'),
  )
  expect(new URL(target).origin).toBe('https://eu.i.posthog.com')
})

/** Runs telemetry with a project token and returns every body sent to PostHog. */
async function sent(work: () => Promise<unknown> | void) {
  const bodies: Array<{ url: string; body: any }> = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push({ url: String(input), body: JSON.parse(String(init?.body)) })
    return new Response('ok')
  }) as typeof fetch
  const pending: Promise<unknown>[] = []
  await withCloudflareRuntime(
    { POSTHOG_PROJECT_TOKEN: 'phc_test' } as never,
    work,
    { waitUntil: (promise) => pending.push(promise) },
  )
  // Recorded MCP calls schedule their capture after reading the response.
  for (let i = 0; i < pending.length; i++) await pending[i]
  return bodies
}

const mcpCall = (name: string) =>
  new Request('https://app.roastbook.coffee/api/mcp', {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name } }),
  })

test('records MCP tool calls without arguments or results', async () => {
  const [event] = await sent(() =>
    observeMcpRequest(mcpCall('list_brews'), async () =>
      Response.json({ result: { content: [{ type: 'text', text: '{"isError":true}' }] } }),
    ),
  )
  expect(event.body.event).toBe('$mcp_tool_call')
  expect(event.body.properties.$mcp_tool_name).toBe('list_brews')
  expect(event.body.properties.$mcp_is_error).toBe(false)
  expect(event.body.properties.$process_person_profile).toBe(false)
  expect(JSON.stringify(event.body)).not.toContain('content')
})

test('marks failed MCP tool calls and ignores unknown tools', async () => {
  const failed = await sent(() =>
    observeMcpRequest(mcpCall('get_brew'), async () =>
      Response.json({ result: { isError: true, content: [] } }),
    ),
  )
  expect(failed[0].body.properties.$mcp_is_error).toBe(true)
  const unknown = await sent(() =>
    observeMcpRequest(mcpCall('drop_tables'), async () => Response.json({})),
  )
  expect(unknown).toHaveLength(0)
})

test('exports request metrics with one histogram bucket', async () => {
  const [metric] = await sent(() => recordRequestMetric('PATCH', 503, 300))
  expect(metric.url).toBe('https://eu.i.posthog.com/i/v1/metrics')
  const [count, duration] = metric.body.resourceMetrics[0].scopeMetrics[0].metrics
  expect(count.sum.dataPoints[0].attributes).toEqual([
    { key: 'http.request.method', value: { stringValue: 'OTHER' } },
    { key: 'http.response.status_class', value: { stringValue: '5xx' } },
  ])
  expect(duration.histogram.dataPoints[0].bucketCounts).toEqual([
    '0', '0', '0', '1', '0', '0', '0', '0',
  ])
})

test('sums PostHog-priced AI costs by provider, model and user', async () => {
  let query = ''
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    query = JSON.parse(String(init?.body)).query.query
    return Response.json({
      results: [
        ['provided', 'gpt-a', 'user-1', 0.5],
        ['provided', 'gpt-b', 'user-1', 0.25],
        ['provided', 'gpt-a', 'user-2', null],
      ],
    })
  }) as typeof fetch
  const costs = await withCloudflareRuntime(
    { POSTHOG_PROJECT_ID: '1', POSTHOG_PERSONAL_API_KEY: 'phx_test' } as never,
    () => loadAiCosts(30, false),
  )
  expect(query).toContain("provider_mode = 'provided'")
  expect(costs).toEqual({
    totalUsd: 0.75,
    byProvider: { provided: 0.75 },
    byModel: { 'gpt-a': 0.5, 'gpt-b': 0.25 },
    byUser: { 'user-1': 0.75, 'user-2': 0 },
  })
})
