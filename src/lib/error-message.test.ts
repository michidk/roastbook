import { describe, expect, test } from 'bun:test'
import { getErrorMessage } from '@/lib/error-message'

describe('getErrorMessage', () => {
  test('returns a useful Error message', () => {
    expect(getErrorMessage(new Error('No coffee'), 'Fallback')).toBe(
      'No coffee',
    )
  })

  test('uses the fallback for empty or non-Error values', () => {
    expect(getErrorMessage(new Error('  '), 'Fallback')).toBe('Fallback')
    expect(getErrorMessage('No coffee', 'Fallback')).toBe('Fallback')
  })
})
