import { describe, expect, test } from 'bun:test'
import { isCsrfRequestAllowed } from '@tanstack/react-start'
import { requestOrigin } from './request-origin'

describe('public origin behind a reverse proxy', () => {
  const publicUrl = 'https://coffee.example.test'
  async function allowed(headers: HeadersInit, configuredUrl = publicUrl) {
    const request = new Request('http://app:3000/_serverFn/save', {
      method: 'POST',
      headers,
    })
    return isCsrfRequestAllowed(
      {
        origin: (origin, ctx) =>
          origin === requestOrigin(ctx.request, configuredUrl),
      },
      {
        request,
        pathname: '/_serverFn/save',
        context: undefined,
        handlerType: 'serverFn',
        next: () => {
          throw new Error('Validation must not execute the handler')
        },
      },
    )
  }

  test('accepts the public Origin without Fetch Metadata', async () => {
    expect(await allowed({ Origin: publicUrl })).toBe(true)
  })
  test('accepts a public Referer when Origin and Fetch Metadata are absent', async () => {
    expect(await allowed({ Referer: `${publicUrl}/brews/new` })).toBe(true)
  })
  test('rejects foreign origins, null origins, and missing provenance', async () => {
    for (const origin of [
      'https://evil.test',
      'null',
      `${publicUrl}.evil.test`,
    ]) {
      expect(await allowed({ Origin: origin })).toBe(false)
    }
    expect(await allowed({})).toBe(false)
    expect(await allowed({ Referer: 'https://evil.test/brews' })).toBe(false)
  })
  test('rejects cross-site Fetch Metadata even with the public Origin', async () => {
    expect(
      await allowed({ Origin: publicUrl, 'Sec-Fetch-Site': 'cross-site' }),
    ).toBe(false)
  })
  test('does not trust forwarded headers to select the public origin', async () => {
    expect(
      await allowed({
        Origin: 'https://evil.test',
        'X-Forwarded-Host': 'evil.test',
        'X-Forwarded-Proto': 'https',
      }),
    ).toBe(false)
    const request = new Request('http://localhost:3000/path')
    expect(requestOrigin(request)).toBe('http://localhost:3000')
    expect(requestOrigin(request, `${publicUrl}/`)).toBe(publicUrl)
  })
})
