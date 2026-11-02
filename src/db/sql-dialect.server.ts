import '@tanstack/react-start/server-only'
import { type SQLWrapper, sql } from 'drizzle-orm'

export function utcDateKey(column: SQLWrapper) {
  return sql<string>`to_char(${column}, 'YYYY-MM-DD')`
}
