import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { deliverAnalytics } from './analytics-delivery.server'

afterEach(() => mock.restore())

test('posts JSON with a deadline, refuses redirects, and cancels the response stream', async () => {
  const response = new Response('ok')
  if (!response.body) throw new Error('Expected a response stream')
  const cancel = spyOn(response.body, 'cancel')
  const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(response)
  await deliverAnalytics({
    endpoint: 'https://example.test/events',
    body: { event: 'bean_created' },
    timeoutMs: 3000,
    headers: { Authorization: 'Bearer token' },
  })
  const [endpoint, options] = fetch.mock.calls[0] ?? []
  expect(endpoint).toBe('https://example.test/events')
  expect(options?.method).toBe('POST')
  expect(options?.redirect).toBe('error')
  expect(options?.signal).toBeInstanceOf(AbortSignal)
  expect(Object.fromEntries(new Headers(options?.headers))).toEqual({
    authorization: 'Bearer token',
    'content-type': 'application/json',
  })
  expect(JSON.parse(String(options?.body))).toEqual({ event: 'bean_created' })
  expect(cancel).toHaveBeenCalledTimes(1)
})

test('reports delivery failure to the caller for its own failure policy', async () => {
  spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('denied', { status: 403 }),
  )
  await expect(
    deliverAnalytics({
      endpoint: 'https://example.test/events',
      body: {},
      timeoutMs: 3000,
    }),
  ).rejects.toThrow('HTTP 403')
})
