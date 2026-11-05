import { describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { decryptAiKey, encryptAiKey } from './ai-credential.server'
import {
  createAiProviderFetch,
  normalizeAiEndpoint,
  resolveAiEndpoint,
} from './ai-provider-fetch.server'

const hosted = { deploymentMode: 'hosted', privateOrigins: [] } as const

describe('AI credential encryption', () => {
  test('encrypts with unique nonces and authenticates the owner, endpoint, and encryption key', () => {
    const key = randomBytes(32)
    const secret = 'test-user-key-that-must-stay-private'
    const endpoint = 'https://api.example.com/v1'
    const sealed = encryptAiKey(secret, 'alice', endpoint, key)
    expect(sealed).not.toContain(secret)
    expect(encryptAiKey(secret, 'alice', endpoint, key)).not.toBe(sealed)
    expect(decryptAiKey(sealed, 'alice', endpoint, key)).toBe(secret)
    expect(() => decryptAiKey(sealed, 'bob', endpoint, key)).toThrow(
      'could not be unlocked',
    )
    expect(() =>
      decryptAiKey(sealed, 'alice', 'https://attacker.example/v1', key),
    ).toThrow()
    expect(() =>
      decryptAiKey(sealed, 'alice', endpoint, randomBytes(32)),
    ).toThrow()
    expect(() =>
      decryptAiKey(sealed.slice(0, -2), 'alice', endpoint, key),
    ).toThrow()
  })
})
describe('AI endpoint policy and transport', () => {
  test('accepts public HTTPS destinations and rejects mixed, private, metadata, and encoded local addresses', async () => {
    expect(normalizeAiEndpoint('https://API.EXAMPLE.COM/v1///')).toBe(
      'https://api.example.com/v1',
    )
    const publicEndpoint = await resolveAiEndpoint(
      'https://provider.example/v1',
      { policy: hosted, resolve: async () => [{ address: '8.8.8.8' }] },
    )
    expect(publicEndpoint.addresses).toEqual([{ address: '8.8.8.8' }])
    for (const address of [
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '100.100.100.200',
      '::1',
      'fd00::1',
      '::ffff:127.0.0.1',
      '2002:7f00:1::',
      '64:ff9b::7f00:1',
    ]) {
      await expect(
        resolveAiEndpoint('https://provider.example/v1', {
          policy: hosted,
          resolve: async () => [{ address: '8.8.8.8' }, { address }],
        }),
      ).rejects.toThrow('not allowed')
    }
    for (const value of [
      'http://api.example.com/v1',
      'https://2130706433/v1',
      'https://0x7f000001/v1',
      'https://[::ffff:7f00:1]/v1',
    ])
      await expect(
        resolveAiEndpoint(value, { policy: hosted }),
      ).rejects.toThrow()
    for (const value of [
      'file:///etc/passwd',
      'https://user:password@api.example/v1',
      'https://api.example/v1?apiKey=secret',
      'https://api.example/v1#secret',
    ])
      expect(() => normalizeAiEndpoint(value)).toThrow()
  })
  test('requires an exact operator-approved origin and never permits private hosted endpoints', async () => {
    const options = {
      policy: {
        deploymentMode: 'self-hosted',
        privateOrigins: ['http://127.0.0.1:11434'],
      },
    } as const
    expect(
      (await resolveAiEndpoint('http://127.0.0.1:11434/v1', options)).url.port,
    ).toBe('11434')
    await expect(
      resolveAiEndpoint('http://127.0.0.1:11435/v1', options),
    ).rejects.toThrow()
    await expect(
      resolveAiEndpoint('https://127.0.0.1/v1', {
        policy: { ...hosted, privateOrigins: ['https://127.0.0.1'] },
      }),
    ).rejects.toThrow()
  })
  test('explains how to enable HTTP for self-hosted providers', async () => {
    const endpoint = 'http://host.containers.internal:42000/v1'
    await expect(
      resolveAiEndpoint(endpoint, {
        policy: { deploymentMode: 'self-hosted', privateOrigins: [] },
      }),
    ).rejects.toThrow('AI_ALLOWED_PRIVATE_ORIGINS')
    const resolved = await resolveAiEndpoint(endpoint, {
      policy: {
        deploymentMode: 'self-hosted',
        privateOrigins: ['http://host.containers.internal:42000'],
      },
      resolve: async () => [{ address: '10.0.0.2' }],
    })
    expect(resolved.url.href).toBe(endpoint)
  })
  test('pins DNS to the approved address, refuses redirects and provider errors, and bounds streamed responses', async () => {
    let requests = 0
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        requests++
        const body = await request.json()
        if (body.action === 'redirect')
          return new Response(null, {
            status: 307,
            headers: { Location: '/should-not-run' },
          })
        if (body.action === 'error')
          return Response.json(
            { error: request.headers.get('authorization') },
            { status: 401 },
          )
        if (body.action === 'large')
          return new Response('x'.repeat(9 * 1024 * 1024))
        return Response.json({
          received: request.headers.get('authorization') === 'Bearer test-key',
        })
      },
    })
    const endpoint = `http://does-not-resolve.invalid:${server.port}/v1`
    let resolutions = 0
    const transport = createAiProviderFetch(endpoint, {
      policy: {
        deploymentMode: 'self-hosted',
        privateOrigins: [new URL(endpoint).origin],
      },
      resolve: async () => {
        resolutions++
        return [{ address: '127.0.0.1' }]
      },
    })
    const send = (action: string) =>
      transport(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })
    try {
      expect(await (await send('ok')).json()).toEqual({ received: true })
      await expect(send('redirect')).rejects.toThrow('(307)')
      await expect(send('error')).rejects.toThrow('rejected your API key')
      const large = await send('large')
      await expect(large.text()).rejects.toThrow('Could not read')
      expect(requests).toBe(4)
      expect(resolutions).toBe(4)
      await expect(
        transport(`${endpoint}/other`, { method: 'POST' }),
      ).rejects.toThrow('Unexpected')
      await expect(transport(`${endpoint}/responses`)).rejects.toThrow(
        'Unexpected',
      )
      expect(requests).toBe(4)
    } finally {
      server.stop(true)
    }
  })
})
