import { describe, expect, it } from 'bun:test'
import { availableYears, buildYearDays } from './stats-activity-calendar'

describe('availableYears', () => {
  it('lists years with activity plus the current year, newest first', () => {
    const days = [
      { date: '2024-02-29', count: 1 },
      { date: '2024-11-03', count: 2 },
      { date: '2025-03-15', count: 1 },
    ]
    expect(availableYears(days, '2026-09-01')).toEqual([2026, 2025, 2024])
  })

  it('falls back to the current year when there is no activity', () => {
    expect(availableYears([], '2026-09-01')).toEqual([2026])
  })
})

describe('buildYearDays', () => {
  it('fills a full past year including leap days', () => {
    const days = buildYearDays(2024, '2026-09-01', new Map())
    expect(days).toHaveLength(366)
    expect(days[0]?.date).toBe('2024-01-01')
    expect(days.at(-1)?.date).toBe('2024-12-31')
  })

  it('clamps the current year at the end date', () => {
    const days = buildYearDays(2026, '2026-09-01', new Map())
    expect(days[0]?.date).toBe('2026-01-01')
    expect(days.at(-1)?.date).toBe('2026-09-01')
    expect(days).toHaveLength(244)
  })

  it('merges recorded counts and zero-fills the rest', () => {
    const counts = new Map([
      ['2025-03-15', 2],
      ['2025-12-31', 1],
    ])
    const days = buildYearDays(2025, '2026-09-01', counts)
    const byDate = new Map(days.map((day) => [day.date, day.count]))
    expect(byDate.get('2025-03-15')).toBe(2)
    expect(byDate.get('2025-12-31')).toBe(1)
    expect(byDate.get('2025-03-14')).toBe(0)
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(3)
  })
})
