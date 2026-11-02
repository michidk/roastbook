import { describe, expect, test } from 'bun:test'
import {
  continuousPercentiles,
  createLocalActivity,
  dateBoundaryInTimeZone,
  nextDateKey,
} from '@/lib/stats-local'

describe('localized statistics', () => {
  test.each([
    ['2026-03-29', 'Europe/Berlin', '2026-03-28T23:00:00.000Z', 23],
    ['2026-10-25', 'Europe/Berlin', '2026-10-24T22:00:00.000Z', 25],
    ['2026-03-08', 'America/New_York', '2026-03-08T05:00:00.000Z', 23],
    ['2026-11-01', 'America/New_York', '2026-11-01T04:00:00.000Z', 25],
    ['2026-11-02', 'Asia/Kathmandu', '2026-11-01T18:15:00.000Z', 24],
    ['2026-11-02', 'Pacific/Kiritimati', '2026-11-01T10:00:00.000Z', 24],
  ])(
    'preserves the boundaries of %s in %s',
    (date, zone, expectedStart, hours) => {
      const start = dateBoundaryInTimeZone(date, zone)
      const end = dateBoundaryInTimeZone(nextDateKey(date), zone)
      expect(start.toISOString()).toBe(expectedStart)
      expect((end.getTime() - start.getTime()) / 3_600_000).toBe(hours)
    },
  )

  test('represents a skipped calendar date as an empty interval', () => {
    expect(dateBoundaryInTimeZone('2011-12-30', 'Pacific/Apia')).toEqual(
      dateBoundaryInTimeZone('2011-12-31', 'Pacific/Apia'),
    )
  })

  test('groups by local day and Monday week and combines a repeated DST hour', () => {
    const day = createLocalActivity('America/New_York', 'day')
    day.add(new Date('2026-11-01T03:59:59Z'), 1)
    day.add(new Date('2026-11-01T05:30:00Z'), 4)
    day.add(new Date('2026-11-01T06:30:00Z'), 5)
    expect(day.result().activityDates).toEqual([
      { date: '2026-10-31', count: 1 },
      { date: '2026-11-01', count: 2 },
    ])
    expect(day.result().rhythm).toContainEqual({
      weekday: 7,
      hour: 1,
      count: 2,
    })
    expect(day.result().trend[1]).toEqual({
      date: '2026-11-01',
      count: 2,
      averageRating: 4.5,
      totalRated: 2,
      highRated: 2,
    })
    const week = createLocalActivity('Pacific/Kiritimati', 'week')
    week.add(new Date('2026-11-01T10:01:00Z'))
    expect(week.result().trend).toEqual([
      {
        date: '2026-11-02',
        count: 1,
        averageRating: null,
        totalRated: 0,
        highRated: 0,
      },
    ])
  })

  test('matches continuous percentile interpolation and preserves the input', () => {
    const input = [40, 10, 30, 20]
    expect(continuousPercentiles(input)).toEqual({
      count: 4,
      median: 25,
      p25: 17.5,
      p75: 32.5,
    })
    expect(input).toEqual([40, 10, 30, 20])
    expect(continuousPercentiles([])).toEqual({
      count: 0,
      median: null,
      p25: null,
      p75: null,
    })
    expect(continuousPercentiles([18])).toEqual({
      count: 1,
      median: 18,
      p25: 18,
      p75: 18,
    })
    expect(continuousPercentiles([0, 0, 0])).toEqual({
      count: 3,
      median: 0,
      p25: 0,
      p75: 0,
    })
  })
})
