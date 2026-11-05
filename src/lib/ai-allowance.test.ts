import { expect, test } from 'bun:test'
import { aiAllowanceWeek } from './ai-allowance'

test('weekly AI allowance resets Monday at midnight UTC across month and year boundaries', () => {
  for (const { now, start, reset } of [
    {
      now: '2026-11-01T23:59:59.999Z',
      start: '2026-10-26T00:00:00.000Z',
      reset: '2026-11-02T00:00:00.000Z',
    },
    {
      now: '2026-11-02T00:00:00Z',
      start: '2026-11-02T00:00:00.000Z',
      reset: '2026-11-09T00:00:00.000Z',
    },
    {
      now: '2027-01-01T12:00:00Z',
      start: '2026-12-28T00:00:00.000Z',
      reset: '2027-01-04T00:00:00.000Z',
    },
  ]) {
    const week = aiAllowanceWeek(new Date(now))
    expect(week.start.toISOString()).toBe(start)
    expect(week.resetAt.toISOString()).toBe(reset)
  }
})
