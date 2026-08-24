import { describe, expect, test } from 'bun:test'
import { formatDate } from '@/lib/utils'

describe('date formatting', () => {
  test('formats date-only values without timezone shifts', () => {
    expect(formatDate('2026-12-31', 'day-month-year-slash')).toBe('31/12/2026')
    expect(formatDate('2026-12-31', 'month-day-year-slash')).toBe('12/31/2026')
    expect(formatDate('2026-12-31', 'day-month-year-dot')).toBe('31.12.2026')
    expect(formatDate('2026-12-31', 'year-month-day')).toBe('2026-12-31')
  })
})
