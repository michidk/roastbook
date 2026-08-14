import { describe, expect, test } from 'bun:test'
import {
  localDateTimeInputToDate,
  toLocalDateTimeInput,
} from '@/lib/date-input'

describe('local date-time inputs', () => {
  test('formats a local value without seconds', () => {
    const value = toLocalDateTimeInput(new Date(2026, 7, 14, 9, 7, 42))
    expect(value).toBe('2026-08-14T09:07')
  })

  test('rejects empty and invalid values', () => {
    expect(localDateTimeInputToDate('')).toBeNull()
    expect(localDateTimeInputToDate('not-a-date')).toBeNull()
  })
})
