import { afterEach, expect, spyOn, test } from 'bun:test'
import {
  createAiProviderFetch,
  resolveAiEndpoint,
} from './ai-provider-fetch.server'
import {
  fetchPublicResource,
  limitResponseBody,
  resolvePublicHost,
} from './public-fetch.server'

const options = {
  resolve: async () => [{ address: '8.8.8.8' }],
  policy: { deploymentMode: 'hosted' as const, privateOrigins: [] },
}
const originalFetch = globalThis.fetch
function mockTransport(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  return spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(handler, { preconnect: originalFetch.preconnect }),
  )
}
afterEach(() => {
  globalThis.fetch = originalFetch
})

test('Workers AI transport blocks redirects and forwards only provider credentials', async () => {
  let forwarded: RequestInit | undefined
  const fetchSpy = mockTransport(async (_input, init) => {
    forwarded = init
    return new Response(null, {
      status: 302,
      headers: { location: 'https://attacker.example/' },
    })
  })
  const provider = createAiProviderFetch('https://provider.example/v1', options)
  await expect(
    provider('https://provider.example/v1/responses', {
      method: 'POST',
      headers: {
        authorization: 'Bearer user-key',
        'content-type': 'application/json',
        cookie: 'private-session',
        'x-private': 'secret',
      },
      body: '{}',
    }),
  ).rejects.toThrow('AI provider request failed (302)')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(forwarded?.redirect).toBe('manual')
  const headers = new Headers(forwarded?.headers)
  expect(headers.get('authorization')).toBe('Bearer user-key')
  expect(headers.has('cookie')).toBe(false)
  expect(headers.has('x-private')).toBe(false)
})
test('Workers AI transport bounds streamed responses and discards reflected response headers', async () => {
  let cancelled = false
  mockTransport(
    async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1))
          },
          cancel() {
            cancelled = true
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
            'x-reflected-key': 'user-key',
          },
        },
      ),
  )
  const response = await createAiProviderFetch(
    'https://provider.example/v1',
    options,
  )('https://provider.example/v1/responses', { method: 'POST', body: '{}' })
  expect(response.headers.has('x-reflected-key')).toBe(false)
  await expect(response.arrayBuffer()).rejects.toThrow(
    'Could not read the AI provider response',
  )
  expect(cancelled).toBe(true)
})
test('Workers public DNS policy rejects a mixed public/private answer', async () => {
  mockTransport(
    async (input) =>
      new Response(
        JSON.stringify({
          Status: 0,
          Answer: [
            {
              type: 1,
              data:
                new URL(String(input)).searchParams.get('type') === 'A'
                  ? '8.8.8.8'
                  : '127.0.0.1',
            },
          ],
        }),
      ),
  )
  await expect(resolvePublicHost('provider.example')).rejects.toThrow(
    'Host is not publicly routable',
  )
})
test.each([
  'http://127.0.0.1/',
  'http://169.254.169.254/',
  'http://[::1]/',
  'http://[::ffff:127.0.0.1]/',
  'https://user:password@example.com/',
])('Workers outbound policy rejects unsafe literal %s', async (input) => {
  const fetchSpy = spyOn(globalThis, 'fetch')
  await expect(fetchPublicResource(input, { method: 'GET' })).rejects.toThrow(
    'URL is not publicly routable',
  )
  expect(fetchSpy).not.toHaveBeenCalled()
})
test('Workers endpoint policy rejects HTTPS hosts with private DNS answers', async () => {
  await expect(
    resolveAiEndpoint('https://provider.example/v1', {
      resolve: async () => [{ address: '127.0.0.1' }],
      policy: { deploymentMode: 'hosted', privateOrigins: [] },
    }),
  ).rejects.toThrow('Use a public provider')
})
test('bounded streams cancel their upstream reader', async () => {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        controller.enqueue(new Uint8Array(20))
      },
      cancel() {
        cancelled = true
      },
    },
    { highWaterMark: 0 },
  )
  await expect(
    new Response(limitResponseBody(body, 10, 'too large')).arrayBuffer(),
  ).rejects.toThrow('too large')
  expect(cancelled).toBe(true)
})
