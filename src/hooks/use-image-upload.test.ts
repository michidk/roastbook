import { describe, expect, test } from 'bun:test'
import { ImageUploadError, validateImageFiles } from '@/hooks/use-image-upload'

describe('image upload file validation', () => {
  test('accepts every image format supported by the server', () => {
    const files = [
      new File(['jpg'], 'coffee.jpg', { type: 'image/jpeg' }),
      new File(['png'], 'coffee.png', { type: 'image/png' }),
      new File(['webp'], 'coffee.webp', { type: 'image/webp' }),
      new File(['heic'], 'coffee.heic', { type: 'image/heic' }),
      new File(['heif'], 'coffee.heif', { type: 'image/heif' }),
      new File(['gif'], 'coffee.gif', { type: 'image/gif' }),
      new File(['avif'], 'coffee.avif', { type: 'image/avif' }),
    ]

    expect(validateImageFiles(files)).toEqual(files)
  })

  test('infers a supported type when a browser omits the MIME type', () => {
    const file = new File(['image'], 'camera.HEIC')

    const [normalized] = validateImageFiles([file])

    expect(normalized?.name).toBe('camera.HEIC')
    expect(normalized?.type).toBe('image/heic')
  })

  test('explains why unsupported and empty files cannot be added', () => {
    expect(() =>
      validateImageFiles([new File(['notes'], 'notes.txt')]),
    ).toThrow(ImageUploadError)
    expect(() =>
      validateImageFiles([new File([], 'empty.png', { type: 'image/png' })]),
    ).toThrow('empty.png is empty')
  })

  test('names the file that exceeds the size limit', () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'huge.jpg', {
      type: 'image/jpeg',
    })

    expect(() => validateImageFiles([file])).toThrow(
      'huge.jpg is larger than the 10 MB limit',
    )
  })
})
