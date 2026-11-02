import type { StatsBucket } from '@/lib/stats-filters'

function dateFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
}

function localParts(formatter: Intl.DateTimeFormat, instant: Date) {
  const parts = formatter.formatToParts(instant)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
  }
}

export function nextDateKey(date: string): string {
  const instant = new Date(`${date}T00:00:00Z`)
  instant.setUTCDate(instant.getUTCDate() + 1)
  return instant.toISOString().slice(0, 10)
}

/** Find the first instant of a calendar date, including DST and skipped dates. */
export function dateBoundaryInTimeZone(date: string, timeZone: string): Date {
  const nominal = new Date(`${date}T00:00:00Z`).getTime()
  if (!Number.isFinite(nominal)) throw new Error('Invalid statistics date')
  if (timeZone === 'UTC') return new Date(nominal)
  const formatter = dateFormatter(timeZone)
  let low = nominal - 3 * 86_400_000
  let high = nominal + 3 * 86_400_000
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (localParts(formatter, new Date(middle)).date < date) low = middle + 1
    else high = middle
  }
  return new Date(low)
}

export function continuousPercentiles(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const percentile = (fraction: number): number | null => {
    if (!sorted.length) return null
    const position = (sorted.length - 1) * fraction
    const lower = sorted[Math.floor(position)]
    const upper = sorted[Math.ceil(position)]
    if (lower === undefined || upper === undefined) return null
    return lower + (upper - lower) * (position - Math.floor(position))
  }
  return {
    count: sorted.length,
    median: percentile(0.5),
    p25: percentile(0.25),
    p75: percentile(0.75),
  }
}

function bucketKey(date: string, bucket: StatsBucket) {
  if (bucket === 'day') return date
  if (bucket === 'month') return `${date.slice(0, 7)}-01`
  const instant = new Date(`${date}T00:00:00Z`)
  instant.setUTCDate(instant.getUTCDate() - ((instant.getUTCDay() + 6) % 7))
  return instant.toISOString().slice(0, 10)
}

export function createLocalActivity(timeZone: string, bucket: StatsBucket) {
  const formatter = dateFormatter(timeZone)
  const days = new Map<string, number>()
  const rhythm = new Map<
    string,
    { weekday: number; hour: number; count: number }
  >()
  const trends = new Map<
    string,
    { count: number; ratingSum: number; totalRated: number; highRated: number }
  >()
  return {
    add(instant: Date, rating: number | null = null) {
      const { date, hour } = localParts(formatter, instant)
      days.set(date, (days.get(date) ?? 0) + 1)
      const weekday = ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1
      const cellKey = `${weekday}:${hour}`
      const cell = rhythm.get(cellKey) ?? { weekday, hour, count: 0 }
      cell.count += 1
      rhythm.set(cellKey, cell)
      const key = bucketKey(date, bucket)
      const trend = trends.get(key) ?? {
        count: 0,
        ratingSum: 0,
        totalRated: 0,
        highRated: 0,
      }
      trend.count += 1
      if (rating !== null) {
        trend.ratingSum += rating
        trend.totalRated += 1
        if (rating >= 4) trend.highRated += 1
      }
      trends.set(key, trend)
    },
    result() {
      const activityDates = [...days]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, count]) => ({ date, count }))
      return {
        firstDate: activityDates[0]?.date ?? null,
        activityDates,
        rhythm: [...rhythm.values()].sort(
          (left, right) =>
            left.weekday - right.weekday || left.hour - right.hour,
        ),
        trend: [...trends]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([date, row]) => ({
            date,
            count: row.count,
            totalRated: row.totalRated,
            highRated: row.highRated,
            averageRating: row.totalRated
              ? Math.round((row.ratingSum / row.totalRated) * 100) / 100
              : null,
          })),
      }
    },
  }
}
