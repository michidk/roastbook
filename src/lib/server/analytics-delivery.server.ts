import '@tanstack/react-start/server-only'

export async function deliverAnalytics({
  endpoint,
  body,
  timeoutMs,
  headers,
}: {
  endpoint: string
  body: unknown
  timeoutMs: number
  headers?: HeadersInit
}) {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Content-Type', 'application/json')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  })
  await response.body?.cancel()
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}
