import { describe, expect, test } from 'bun:test'
import { remoteImageFilename } from '@/lib/server/remote-image'

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
