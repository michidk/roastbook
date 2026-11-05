import '@tanstack/react-start/server-only'
import { type SQLWrapper, sql } from 'drizzle-orm'

export function utcDateKey(column: SQLWrapper) {
  return sql<string>`strftime('%Y-%m-%d', ${column} / 1000.0, 'unixepoch')`
}
