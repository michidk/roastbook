import { describe, expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { prepareAiImages } from './ai-images.server'

async function photo(format: 'png' | 'jpeg' | 'webp', width = 30, height = 20) {
  return sharp({
    create: { width, height, channels: 3, background: '#c7352c' },
  })
    .toFormat(format)
    .toBuffer()
}
const input = (bytes: Buffer, mimeType: string) => ({
  imageBase64: bytes.toString('base64'),
  mimeType,
})

describe('AI image preparation', () => {
  test.each(['png', 'jpeg', 'webp'] as const)(
    'preserves suitable %s bytes and MIME',
    async (format) => {
      const bytes = await photo(format)
      const [prepared] = await prepareAiImages([
        input(bytes, `image/${format}`),
      ])
      expect(prepared?.bytes).toEqual(bytes)
      expect(prepared).toMatchObject({
        mimeType: `image/${format}`,
        width: 30,
        height: 20,
      })
    },
  )
  test('corrects orientation, bounds dimensions, and strips photo metadata', async () => {
    const bytes = await sharp(await photo('jpeg', 3000, 2000))
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const [prepared] = await prepareAiImages([input(bytes, 'image/jpeg')])
    expect(prepared).toMatchObject({
      mimeType: 'image/jpeg',
      width: 1365,
      height: 2048,
    })
    const metadata = await sharp(prepared?.bytes).metadata()
    expect(metadata.exif).toBeUndefined()
    expect(metadata.orientation).toBeUndefined()
  })
  test('rejects mismatched types, truncated images, and empty or oversized batches', async () => {
    const bytes = await photo('png')
    await expect(prepareAiImages([input(bytes, 'image/jpeg')])).rejects.toThrow(
      'match',
    )
    await expect(
      prepareAiImages([input(bytes.subarray(0, 60), 'image/png')]),
    ).rejects.toThrow()
    await expect(prepareAiImages([])).rejects.toThrow()
    await expect(
      prepareAiImages(Array(7).fill(input(bytes, 'image/png'))),
    ).rejects.toThrow()
  })
  test('rejects animation submitted directly to extraction', async () => {
    const bytes = await sharp(randomBytes(2 * 4 * 3), {
      raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
    })
      .gif({ loop: 0, delay: [100, 100] })
      .toBuffer()
    expect((await sharp(bytes).metadata()).pages).toBe(2)
    await expect(prepareAiImages([input(bytes, 'image/gif')])).rejects.toThrow(
      'animated',
    )
  })
  test('bounds total prepared image bytes before transport encoding', async () => {
    const bytes = await sharp(randomBytes(1800 * 1800 * 3), {
      raw: { width: 1800, height: 1800, channels: 3 },
    })
      .png()
      .toBuffer()
    await expect(
      prepareAiImages(Array(4).fill(input(bytes, 'image/png'))),
    ).rejects.toThrow('32 MiB')
  }, 15000)
})
