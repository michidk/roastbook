import { and, gte, lt, type SQL, type SQLWrapper } from 'drizzle-orm'
import { dateBoundaryInTimeZone, nextDateKey } from '@/lib/stats-local'

// Compare stored instants using the column's native driver encoder. This keeps
// calendar ranges identical across database timestamp representations.
export function localDateRangeCondition(
  column: SQLWrapper,
  timeZone: string,
  start: string | null,
  end: string,
): SQL<unknown> {
  const before = lt(column, dateBoundaryInTimeZone(nextDateKey(end), timeZone))
  if (!start) return before
  return (
    and(gte(column, dateBoundaryInTimeZone(start, timeZone)), before) ?? before
  )
}
