import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { prepareStoredImage } from '@/journal/domain/stored-image'

describe('stored image preparation', () => {
  test('counts only compressed storage bytes, including both thumbnails, and strips metadata', async () => {
    const original = await sharp({
      create: { width: 3000, height: 4000, channels: 3, background: '#987654' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const prepared = await prepareStoredImage(
      original,
      'image/jpeg',
      'gear/1/photo.webp',
    )
    expect(prepared.files.map((file) => file.path)).toEqual([
      'gear/1/photo.webp',
      'gear/1/photo.thumb.webp',
      'gear/1/photo.small.webp',
    ])
    expect(prepared.storageBytes).toBe(
      prepared.files.reduce((sum, file) => sum + file.buffer.byteLength, 0),
    )
    expect(prepared.files[0]?.buffer.byteLength).toBe(prepared.sizeBytes)
    expect(prepared.storageBytes).toBeLessThan(original.byteLength)
    const dimensions = []
    for (const file of prepared.files) {
      const metadata = await sharp(file.buffer).metadata()
      expect(metadata.format).toBe('webp')
      expect(metadata.exif).toBeUndefined()
      dimensions.push(metadata.width)
    }
    expect(dimensions).toEqual([1600, 640, 128])
  })
  test('rejects unsupported content before creating stored files', async () => {
    await expect(
      prepareStoredImage(Buffer.from('<svg/>'), 'image/png', 'gear/1/a.webp'),
    ).rejects.toThrow()
  })
})
