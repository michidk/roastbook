import { describe, expect, test } from 'bun:test'
import type { ImageFile } from '@/hooks/useImageUpload'
import {
  getEntityImageUploadFailureMessage,
  uploadEntityImagesWith,
} from '@/lib/upload-entity-images'

function image(name: string): ImageFile {
  const file = new File(['image'], name, { type: 'image/png' })
  return { file, preview: `blob:${name}`, base64: 'aW1hZ2U=' }
}

describe('entity image batches', () => {
  test('keeps partial failures retryable without repeating successes', async () => {
    const first = image('first.png')
    const second = image('second.png')
    const calls: string[] = []
    const upload = async ({ data }: { data: FormData }) => {
      const file = data.get('file')
      if (!(file instanceof File)) throw new Error('file missing')
      calls.push(file.name)
      if (file.name === 'second.png') throw new Error('storage unavailable')
      return { id: 1, storagePath: 'beans/1/first.png', url: '/first.png' }
    }

    const result = await uploadEntityImagesWith(upload, 'beans', 1, [
      first,
      second,
    ])

    expect(calls).toEqual(['first.png', 'second.png'])
    expect(result.uploaded).toEqual([first])
    expect(result.failures.map(({ image }) => image)).toEqual([second])
  })

  test('reports the failed filename and underlying reason', () => {
    const failedImage = image('pixel-photo.jpg')

    expect(
      getEntityImageUploadFailureMessage([
        { image: failedImage, error: new Error('Request body is too large') },
      ]),
    ).toBe('Upload failed for pixel-photo.jpg: Request body is too large')
  })

  test('summarizes a batch while preserving its first actionable error', () => {
    expect(
      getEntityImageUploadFailureMessage([
        { image: image('first.jpg'), error: new Error('Storage unavailable') },
        { image: image('second.jpg'), error: new Error('Timed out') },
      ]),
    ).toBe(
      'Could not upload 2 pictures. First failure — first.jpg: Storage unavailable',
    )
  })
})
