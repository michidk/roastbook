import { expect, test } from 'bun:test'
import { canonicalRequest, secureResponse } from './http.server'

test('ingress rejects unexpected origins and operator URLs with paths', () => {
  const response = canonicalRequest(
    new Request('https://attacker.example/api/auth/get-session'),
    { AUTH_URL: 'https://app.roastbook.coffee' },
  )
  expect(response instanceof Response && response.status).toBe(421)
  const configured = canonicalRequest(
    new Request('https://app.roastbook.coffee/'),
    { AUTH_URL: 'https://app.roastbook.coffee/path' },
  )
  expect(configured instanceof Response && configured.status).toBe(421)
})
test('ingress removes supplied forwarding headers and uses Cloudflare client address', () => {
  const request = canonicalRequest(
    new Request('https://app.roastbook.coffee/', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'x-real-ip': '1.2.3.4',
        forwarded: 'for=1.2.3.4',
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'http',
        'x-forwarded-for': '1.2.3.4',
      },
    }),
    { AUTH_URL: 'https://app.roastbook.coffee' },
  )
  expect(request).toBeInstanceOf(Request)
  if (request instanceof Response) throw new Error('expected request')
  expect(request.headers.get('x-real-ip')).toBe('203.0.113.10')
  for (const name of [
    'forwarded',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-for',
  ])
    expect(request.headers.has(name)).toBe(false)
})
test('responses preserve auth referrer policy and expose release revision without public caching', () => {
  const response = secureResponse(
    new Response('ok', {
      headers: {
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'public,max-age=3600',
      },
    }),
    'a'.repeat(40),
  )
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(response.headers.get('X-Roastbook-Revision')).toBe('a'.repeat(40))
})
