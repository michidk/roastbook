import { afterEach, expect, test } from 'bun:test'

const { proxyConsent } = await import('./consent.server')
const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
})

test('proxies to the Roastbook consent site without cookies or client IP', async () => {
  let forwarded: Request | undefined
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    forwarded = new Request(input, init)
    return new Response('ok')
  }) as typeof fetch
  const request = new Request(
    'https://app.roastbook.coffee/consent/subjects?x=1',
    {
      method: 'POST',
      body: '{}',
      headers: {
        cookie: 'better-auth.session_token=secret',
        'x-real-ip': '203.0.113.9',
        'cf-ipcountry': 'US',
        origin: 'https://app.roastbook.coffee',
        'content-type': 'application/json',
      },
    },
  )
  await proxyConsent(request, { country: 'DE', regionCode: 'BY' })
  expect(forwarded?.url).toBe(
    'https://consent.k8s.lohr.dev/s/roastbook-app/subjects?x=1',
  )
  expect(forwarded?.headers.get('cookie')).toBeNull()
  expect(forwarded?.headers.get('x-real-ip')).toBeNull()
  expect(forwarded?.headers.get('origin')).toBe('https://app.roastbook.coffee')
  expect(forwarded?.headers.get('x-visitor-country')).toBe('DE')
  expect(forwarded?.headers.get('cf-ipcountry')).toBeNull()
  expect(forwarded?.headers.get('cf-region-code')).toBe('BY')
})

test('refuses paths that leave the Roastbook site', async () => {
  let called = false
  globalThis.fetch = (async () => {
    called = true
    return new Response('ok')
  }) as typeof fetch
  for (const path of ['/consent/../other/init', '/consent/%2e%2e/other/init'])
    expect(
      (await proxyConsent(new Request(`https://app.roastbook.coffee${path}`)))
        .status,
    ).toBe(404)
  expect(called).toBe(false)
})
