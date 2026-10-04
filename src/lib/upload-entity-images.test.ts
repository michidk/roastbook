import { describe, expect, test } from 'bun:test'
import type { ImageFile } from '@/lib/image-file'
import { uploadEntityImagesWith } from '@/lib/upload-entity-images'

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

    const result = await uploadEntityImagesWith(upload, 'bean-purchases', 1, [
      first,
      second,
    ])

    expect(calls).toEqual(['first.png', 'second.png'])
    expect(result.uploaded).toEqual([first])
    expect(result.failures.map(({ image }) => image)).toEqual([second])
  })

  test('retries a browser transport failure with base64 JSON', async () => {
    const picture = image('mobile.png')
    const base64Calls: string[] = []

    const result = await uploadEntityImagesWith(
      async () => {
        throw new TypeError('Failed to fetch')
      },
      'bean-purchases',
      7,
      [picture],
      async ({ data }) => {
        base64Calls.push(data.fileBase64)
      },
    )

    expect(base64Calls).toEqual([picture.base64])
    expect(result.uploaded).toEqual([picture])
    expect(result.failures).toEqual([])
  })

  test('does not retry server rejections through the compatibility path', async () => {
    const picture = image('invalid.png')
    let base64Calls = 0

    const result = await uploadEntityImagesWith(
      async () => {
        throw new Error('Unsupported image type')
      },
      'bean-purchases',
      7,
      [picture],
      async () => {
        base64Calls += 1
      },
    )

    expect(base64Calls).toBe(0)
    expect(result.uploaded).toEqual([])
    expect(result.failures).toHaveLength(1)
  })
})
