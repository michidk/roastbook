import { describe, expect, test } from 'bun:test'
import {
  createEntityImageUploadFormData,
  parseEntityImageUploadFormData,
} from '@/lib/entity-image-upload-form'

describe('entity image upload forms', () => {
  test('keeps a large image as binary FormData without base64 expansion', async () => {
    const bytes = new Uint8Array(5_547_900)
    const file = new File([bytes], 'PXL_20260821_064208635.MP.jpg', {
      type: 'image/jpeg',
    })

    const parsed = parseEntityImageUploadFormData(
      createEntityImageUploadFormData('beans', 42, file),
    )

    expect(parsed.entityType).toBe('beans')
    expect(parsed.entityId).toBe(42)
    expect(parsed.filename).toBe(file.name)
    expect(parsed.mimeType).toBe('image/jpeg')
    expect(parsed.sizeBytes).toBe(bytes.byteLength)
    expect(await parsed.file.arrayBuffer()).toHaveLength(bytes.byteLength)
  })

  test('rejects a form without an image file', () => {
    expect(() => parseEntityImageUploadFormData(new FormData())).toThrow(
      'Choose an image file to upload',
    )
  })
})
