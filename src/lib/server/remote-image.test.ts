import { describe, expect, test } from 'bun:test'
import {
  downloadImage,
  remoteImageFilename,
} from '@/lib/server/remote-image.server'

describe('downloadImage', () => {
  test('connects only to the address approved by policy validation', async () => {
    let independentlyResolvedAddress = '127.0.0.1'

    const image = await downloadImage('https://images.example/picture.png', {
      resolveHost: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async (url, approvedAddresses) => {
        expect(url.hostname).toBe('images.example')
        expect(independentlyResolvedAddress).toBe('127.0.0.1')
        expect(approvedAddresses).toEqual([
          { address: '93.184.216.34', family: 4 },
        ])
        independentlyResolvedAddress = approvedAddresses[0]?.address ?? ''
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'content-type': 'image/png' },
        })
      },
    })

    expect(independentlyResolvedAddress).toBe('93.184.216.34')
    expect(image.filename).toBe('picture.png')
  })

  test('resolves and pins every redirect target independently', async () => {
    const connections: Array<{ host: string; address: string }> = []

    await downloadImage('https://first.example/picture', {
      resolveHost: async (hostname) => [
        {
          address: hostname === 'first.example' ? '93.184.216.34' : '1.1.1.1',
          family: 4,
        },
      ],
      request: async (url, addresses) => {
        connections.push({
          host: url.hostname,
          address: addresses[0]?.address ?? '',
        })
        if (url.hostname === 'first.example') {
          return new Response(null, {
            status: 302,
            headers: { location: 'https://second.example/final.png' },
          })
        }
        return new Response(new Uint8Array([1]), {
          headers: { 'content-type': 'image/png' },
        })
      },
    })

    expect(connections).toEqual([
      { host: 'first.example', address: '93.184.216.34' },
      { host: 'second.example', address: '1.1.1.1' },
    ])
  })
})

describe('remoteImageFilename', () => {
  test('uses the response format for an auto-formatted CDN image', () => {
    const url = new URL(
      'https://assets.example.com/cdn-cgi/image/format=auto/product.png?pdp',
    )

    expect(remoteImageFilename(url, 'image/avif')).toBe('product.avif')
  })

  test('keeps a decoded filename stem', () => {
    const url = new URL('https://example.com/My%20Coffee.jpeg')

    expect(remoteImageFilename(url, 'image/webp')).toBe('My Coffee.webp')
  })

  test('uses the final path segment when the URL has a trailing slash', () => {
    const url = new URL('https://example.com/catalog/My%20Coffee.jpeg/')

    expect(remoteImageFilename(url, 'image/webp')).toBe('My Coffee.webp')
  })

  test('falls back when the resulting filename is too long', () => {
    const url = new URL(`https://example.com/${'a'.repeat(252)}.png`)

    expect(remoteImageFilename(url, 'image/png')).toBe('picture.png')
  })
})
