import { describe, expect, test } from 'bun:test'
import { fillDailyActivity } from '@/lib/stats-activity'

describe('ranking and stats helpers', () => {
  test('fills a 30-day activity window', () => {
    const activity = fillDailyActivity(
      [{ date: '2026-01-15', count: 3 }],
      new Date(2026, 0, 15, 12),
    )
    expect(activity).toHaveLength(30)
    expect(activity.at(-1)).toEqual({ date: '2026-01-15', count: 3 })
    expect(activity.filter(({ count }) => count > 0)).toHaveLength(1)
  })
})
