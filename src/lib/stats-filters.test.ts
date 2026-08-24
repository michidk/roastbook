import { describe, expect, test } from 'bun:test'
import {
  percentChange,
  resolveStatsRange,
  statsFilterSchema,
} from '@/lib/stats-filters'

describe('statistics filters', () => {
  test('defaults to a comparable 30-day window', () => {
    const filter = statsFilterSchema.parse({})
    const range = resolveStatsRange(
      filter,
      new Date('2026-08-14T12:00:00Z'),
      'UTC',
    )

    expect(filter.period).toBe('30d')
    expect(range).toEqual({
      start: '2026-07-16',
      end: '2026-08-14',
      previousStart: '2026-06-16',
      previousEnd: '2026-07-15',
      bucket: 'day',
      days: 30,
    })
  })

  test('uses the installation time zone for the current calendar day', () => {
    const filter = statsFilterSchema.parse({ period: '30d' })
    const range = resolveStatsRange(
      filter,
      new Date('2026-08-14T01:00:00Z'),
      'America/Los_Angeles',
    )

    expect(range.end).toBe('2026-08-13')
  })

  test('normalizes reversed custom dates and clamps future ranges', () => {
    const filter = statsFilterSchema.parse({
      period: 'custom',
      from: '2026-08-20',
      to: '2026-08-01',
    })
    const range = resolveStatsRange(
      filter,
      new Date('2026-08-14T12:00:00Z'),
      'UTC',
    )

    expect(range.start).toBe('2026-08-01')
    expect(range.end).toBe('2026-08-14')
  })

  test('only compares percentages when the previous value is meaningful', () => {
    expect(percentChange(12, 10)).toBe(20)
    expect(percentChange(0, 0)).toBeNull()
    expect(percentChange(3, null)).toBeNull()
  })
})
