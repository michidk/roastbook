import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { validateImageBuffer } from '@/lib/thumbnail-image'

describe('validateImageBuffer', () => {
  test('accepts an image whose bytes match its declared MIME type', async () => {
    const image = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: '#6f4e37',
      },
    })
      .png()
      .toBuffer()

    await expect(
      validateImageBuffer(image, 'image/png'),
    ).resolves.toBeUndefined()
  })

  test('rejects mismatched MIME types and non-image data', async () => {
    const image = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: '#6f4e37',
      },
    })
      .jpeg()
      .toBuffer()

    await expect(validateImageBuffer(image, 'image/png')).rejects.toThrow(
      'do not match',
    )
    await expect(
      validateImageBuffer(Buffer.from('not an image'), 'image/png'),
    ).rejects.toThrow()
  })
})
