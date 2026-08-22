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

  test('does not expose an upstream HTML error page', () => {
    expect(
      getErrorMessage(
        new Error(
          '<html><head><title>503 Service Temporarily Unavailable</title></head><body><h1>503</h1></body></html>',
        ),
        'Could not generate a recommendation',
      ),
    ).toBe('The service is temporarily unavailable. Try again.')
  })
})
