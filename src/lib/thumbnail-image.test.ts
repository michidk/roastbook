import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import {
  createAiImage,
  createSmallThumbnail,
  createStoredImage,
  validateImageBuffer,
} from '@/lib/thumbnail-image'

describe('createSmallThumbnail', () => {
  test('creates a compact image for list avatars', async () => {
    const image = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: '#6f4e37',
      },
    })
      .png()
      .toBuffer()

    const result = await createSmallThumbnail(image)
    const metadata = await sharp(result).metadata()

    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(128)
    expect(metadata.height).toBe(96)
  })
})

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

describe('createAiImage', () => {
  test('orients, downsizes, and converts phone photos for vision models', async () => {
    const image = await sharp({
      create: {
        width: 3_000,
        height: 4_000,
        channels: 3,
        background: '#c7352c',
      },
    })
      .png()
      .toBuffer()

    const result = await createAiImage(image)
    const metadata = await sharp(result).metadata()

    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBe(1_536)
    expect(metadata.height).toBe(2_048)
  })
})

describe('createStoredImage', () => {
  test('stores a bounded image instead of the full-resolution upload', async () => {
    const image = await sharp({
      create: {
        width: 3_472,
        height: 4_624,
        channels: 3,
        background: '#c7352c',
      },
    })
      .jpeg()
      .withMetadata({ orientation: 1 })
      .toBuffer()

    const result = await createStoredImage(image)
    const metadata = await sharp(result).metadata()

    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(1_201)
    expect(metadata.height).toBe(1_600)
    expect(metadata.orientation).toBeUndefined()
    expect(result.byteLength).toBeLessThan(image.byteLength)
  })
})
