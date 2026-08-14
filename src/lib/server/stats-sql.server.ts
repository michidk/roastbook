import { and, gte, lte, type SQL, type SQLWrapper, sql } from 'drizzle-orm'
import type { StatsBucket } from '@/lib/stats-filters'

export function localTimestamp(column: SQLWrapper, timeZone: string) {
  // Drizzle stores JavaScript dates in timestamp-without-time-zone columns as
  // UTC wall time. Mark them as UTC before converting to the journal zone.
  return sql<Date>`timezone(${timeZone}, ${column} at time zone 'UTC')`
}

export function localDate(column: SQLWrapper, timeZone: string) {
  return sql<string>`date(${localTimestamp(column, timeZone)})`
}

export function localDateKey(column: SQLWrapper, timeZone: string) {
  return sql<string>`to_char(${localTimestamp(column, timeZone)}, 'YYYY-MM-DD')`
}

export function localDateRangeCondition(
  column: SQLWrapper,
  timeZone: string,
  start: string | null,
  end: string,
): SQL<unknown> {
  const date = localDate(column, timeZone)
  if (start) {
    const condition = and(gte(date, start), lte(date, end))
    if (condition) return condition
  }
  return lte(date, end)
}

export function statsBucketExpression(
  column: SQLWrapper,
  timeZone: string,
  bucket: StatsBucket,
) {
  const interval =
    bucket === 'day' ? 'day' : bucket === 'week' ? 'week' : 'month'
  return sql<string>`to_char(date_trunc(${interval}, ${localTimestamp(column, timeZone)}), 'YYYY-MM-DD')`
}
