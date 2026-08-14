import { describe, expect, test } from 'bun:test'
import {
  calculateStreaks,
  fillBucketSeries,
  highRatingRange,
} from '@/lib/stats-analysis'
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

describe('statistics analysis', () => {
  test('calculates current and longest consecutive-day streaks', () => {
    expect(
      calculateStreaks(
        [
          { date: '2026-08-08', count: 1 },
          { date: '2026-08-09', count: 2 },
          { date: '2026-08-12', count: 1 },
          { date: '2026-08-13', count: 1 },
        ],
        '2026-08-14',
      ),
    ).toEqual({ current: 2, longest: 2 })
  })

  test('requires three high-rated observations before reporting a range', () => {
    expect(
      highRatingRange([
        { value: 2, rating: 5 },
        { value: 2.2, rating: 4 },
      ]),
    ).toBeNull()
    expect(
      highRatingRange([
        { value: 2, rating: 5 },
        { value: 2.2, rating: 4 },
        { value: 1.9, rating: 5 },
        { value: 3, rating: 3 },
      ]),
    ).toEqual({ minimum: 1.9, maximum: 2.2, count: 3 })
  })

  test('fills empty calendar buckets without inventing ratings', () => {
    expect(
      fillBucketSeries<{
        readonly date: string
        readonly count: number
        readonly averageRating: number | null
      }>(
        [{ date: '2026-08-12', count: 2, averageRating: 4.5 }],
        '2026-08-11',
        '2026-08-13',
        'day',
        (date) => ({ date, count: 0, averageRating: null }),
      ),
    ).toEqual([
      { date: '2026-08-11', count: 0, averageRating: null },
      { date: '2026-08-12', count: 2, averageRating: 4.5 },
      { date: '2026-08-13', count: 0, averageRating: null },
    ])
  })
})
