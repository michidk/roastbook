import { describe, expect, test } from 'bun:test'
import { dataUrlToBase64 } from '@/lib/image-base64'

describe('dataUrlToBase64', () => {
  test('returns the payload after the data URL header', () => {
    expect(dataUrlToBase64('data:image/png;base64,aGVsbG8=')).toBe('aGVsbG8=')
  })

  test('returns null for a value without a payload', () => {
    expect(dataUrlToBase64('data:image/png;base64,')).toBeNull()
    expect(dataUrlToBase64('not-a-data-url')).toBeNull()
  })
})
