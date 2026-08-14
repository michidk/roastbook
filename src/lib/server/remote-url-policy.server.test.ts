import { describe, expect, test } from 'bun:test'
import {
  assertPublicHttpUrl,
  isPrivateAddress,
} from '@/lib/server/remote-url-policy.server'

describe('remote URL policy', () => {
  test.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.0.1',
    '198.18.0.1',
    '224.0.0.1',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
  ])('rejects non-public address %s', (address) => {
    expect(isPrivateAddress(address)).toBe(true)
  })

  test.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])(
    'allows public address %s',
    (address) => {
      expect(isPrivateAddress(address)).toBe(false)
    },
  )

  test('rejects credentials and non-HTTP protocols', async () => {
    await expect(assertPublicHttpUrl('file:///tmp/image.png')).rejects.toThrow(
      'HTTP or HTTPS',
    )
    await expect(
      assertPublicHttpUrl('https://user:secret@example.com/image.png'),
    ).rejects.toThrow('credentials')
  })

  test('rejects localhost and any private DNS answer', async () => {
    await expect(
      assertPublicHttpUrl('http://localhost/image.png'),
    ).rejects.toThrow('not allowed')
    await expect(
      assertPublicHttpUrl('https://example.test/image.png', async () => [
        { address: '93.184.216.34' },
        { address: '127.0.0.1' },
      ]),
    ).rejects.toThrow('not allowed')
  })

  test('returns a validated URL when every DNS answer is public', async () => {
    const url = await assertPublicHttpUrl(
      'https://example.test/image.png',
      async () => [{ address: '93.184.216.34' }],
    )
    expect(url.href).toBe('https://example.test/image.png')
  })

  test('normalizes DNS resolution failures', async () => {
    await expect(
      assertPublicHttpUrl('https://missing.test/image.png', async () => {
        throw new Error('ENOTFOUND missing.test')
      }),
    ).rejects.toThrow('Could not resolve the image host')
  })
})
