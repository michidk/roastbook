import { describe, expect, test } from 'bun:test'
import {
  calculateStreaks,
  fillBucketSeries,
  highRatingRange,
} from '@/lib/stats-analysis'

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

describe('bucket series filling', () => {
  test('returns an empty series when there are no rows and no start date', () => {
    expect(
      fillBucketSeries<{ readonly date: string; readonly count: number }>(
        [],
        null,
        '2026-08-13',
        'day',
        (date) => ({ date, count: 0 }),
      ),
    ).toEqual([])
  })

  test('starts from the first row when no explicit start is given', () => {
    expect(
      fillBucketSeries<{ readonly date: string; readonly count: number }>(
        [{ date: '2026-08-12', count: 1 }],
        null,
        '2026-08-13',
        'day',
        (date) => ({ date, count: 0 }),
      ),
    ).toEqual([
      { date: '2026-08-12', count: 1 },
      { date: '2026-08-13', count: 0 },
    ])
  })

  test('produces a single bucket when start and end coincide', () => {
    expect(
      fillBucketSeries<{ readonly date: string; readonly count: number }>(
        [{ date: '2026-08-12', count: 4 }],
        '2026-08-12',
        '2026-08-12',
        'day',
        (date) => ({ date, count: 0 }),
      ),
    ).toEqual([{ date: '2026-08-12', count: 4 }])
  })

  test('aligns weekly buckets to Monday, including Sundays', () => {
    // 2026-08-16 is a Sunday, so it belongs to the week starting 2026-08-10.
    expect(
      fillBucketSeries<{ readonly date: string; readonly count: number }>(
        [{ date: '2026-08-10', count: 2 }],
        '2026-08-16',
        '2026-08-18',
        'week',
        (date) => ({ date, count: 0 }),
      ),
    ).toEqual([
      { date: '2026-08-10', count: 2 },
      { date: '2026-08-17', count: 0 },
    ])
  })

  test('aligns monthly buckets to the first of the month', () => {
    expect(
      fillBucketSeries<{ readonly date: string; readonly count: number }>(
        [{ date: '2026-07-01', count: 3 }],
        '2026-06-15',
        '2026-08-02',
        'month',
        (date) => ({ date, count: 0 }),
      ),
    ).toEqual([
      { date: '2026-06-01', count: 0 },
      { date: '2026-07-01', count: 3 },
      { date: '2026-08-01', count: 0 },
    ])
  })
})

describe('streak calculation', () => {
  test('reports zero streaks for empty or inactive activity', () => {
    expect(calculateStreaks([], '2026-08-14')).toEqual({
      current: 0,
      longest: 0,
    })
    expect(
      calculateStreaks([{ date: '2026-08-13', count: 0 }], '2026-08-14'),
    ).toEqual({ current: 0, longest: 0 })
  })

  test('counts a single active day as a streak of one', () => {
    expect(
      calculateStreaks([{ date: '2026-08-14', count: 1 }], '2026-08-14'),
    ).toEqual({ current: 1, longest: 1 })
  })

  test('keeps the current streak alive when the latest activity was yesterday', () => {
    expect(
      calculateStreaks(
        [
          { date: '2026-08-12', count: 1 },
          { date: '2026-08-13', count: 1 },
        ],
        '2026-08-14',
      ),
    ).toEqual({ current: 2, longest: 2 })
  })

  test('resets the current streak after a gap while keeping the longest', () => {
    expect(
      calculateStreaks(
        [
          { date: '2026-08-08', count: 1 },
          { date: '2026-08-09', count: 1 },
          { date: '2026-08-10', count: 1 },
        ],
        '2026-08-14',
      ),
    ).toEqual({ current: 0, longest: 3 })
  })

  test('deduplicates repeated dates within the same streak', () => {
    expect(
      calculateStreaks(
        [
          { date: '2026-08-13', count: 1 },
          { date: '2026-08-13', count: 2 },
          { date: '2026-08-14', count: 1 },
        ],
        '2026-08-14',
      ),
    ).toEqual({ current: 2, longest: 2 })
  })
})

describe('high rating range', () => {
  test('returns null for empty input', () => {
    expect(highRatingRange([])).toBeNull()
  })

  test('ignores null values and low ratings when counting observations', () => {
    expect(
      highRatingRange([
        { value: null, rating: 5 },
        { value: 2, rating: 5 },
        { value: 2.1, rating: 4 },
        { value: 9, rating: 3 },
      ]),
    ).toBeNull()
  })

  test('collapses identical values into a zero-width range', () => {
    expect(
      highRatingRange([
        { value: 2, rating: 4 },
        { value: 2, rating: 5 },
        { value: 2, rating: 4 },
      ]),
    ).toEqual({ minimum: 2, maximum: 2, count: 3 })
  })
})
