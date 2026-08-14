import { z } from 'zod'

export const STATS_PERIOD_OPTIONS = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
] as const

export const statsFilterSchema = z.object({
  period: z
    .enum(['30d', '90d', 'ytd', '1y', 'all', 'custom'])
    .default('30d')
    .catch('30d'),
  method: z.number().int().positive().optional().catch(undefined),
  bean: z.number().int().positive().optional().catch(undefined),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
})

export type StatsFilter = z.infer<typeof statsFilterSchema>
export type StatsPeriod = StatsFilter['period']
export type StatsBucket = 'day' | 'week' | 'month'

export function isStatsPeriod(value: string): value is StatsPeriod {
  return STATS_PERIOD_OPTIONS.some((period) => period.value === value)
}

export type StatsRange = {
  readonly start: string | null
  readonly end: string
  readonly previousStart: string | null
  readonly previousEnd: string | null
  readonly bucket: StatsBucket
  readonly days: number | null
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseDateKey(value: string): Date {
  return new Date(`${value}T00:00:00Z`)
}

function addDays(value: string, days: number): string {
  const date = parseDateKey(value)
  date.setUTCDate(date.getUTCDate() + days)
  return dateKey(date)
}

export function daysBetween(start: string, end: string): number {
  return (
    Math.round(
      (parseDateKey(end).getTime() - parseDateKey(start).getTime()) /
        86_400_000,
    ) + 1
  )
}

export function dateKeyInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function resolveStatsRange(
  filter: StatsFilter,
  now: Date,
  timeZone: string,
): StatsRange {
  const today = dateKeyInTimeZone(now, timeZone)
  let start: string | null

  switch (filter.period) {
    case '30d':
      start = addDays(today, -29)
      break
    case '90d':
      start = addDays(today, -89)
      break
    case 'ytd':
      start = `${today.slice(0, 4)}-01-01`
      break
    case '1y':
      start = addDays(today, -364)
      break
    case 'all':
      start = null
      break
    case 'custom': {
      const from = filter.from ?? addDays(today, -29)
      const to = filter.to && filter.to < today ? filter.to : today
      start = from <= to ? from : to
      const end = from <= to ? to : from > today ? today : from
      const days = daysBetween(start, end)
      return buildRange(start, end, days)
    }
  }

  return start === null
    ? {
        start: null,
        end: today,
        previousStart: null,
        previousEnd: null,
        bucket: 'month',
        days: null,
      }
    : buildRange(start, today, daysBetween(start, today))
}

function buildRange(start: string, end: string, days: number): StatsRange {
  const previousEnd = addDays(start, -1)
  const previousStart = addDays(previousEnd, -(days - 1))
  return {
    start,
    end,
    previousStart,
    previousEnd,
    bucket: days <= 45 ? 'day' : days <= 400 ? 'week' : 'month',
    days,
  }
}

export function percentChange(
  current: number,
  previous: number | null,
): number | null {
  if (previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}
