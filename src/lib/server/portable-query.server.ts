import { type SQLWrapper, sql } from 'drizzle-orm'

export function caseInsensitiveLike(column: SQLWrapper, pattern: string) {
  return sql`lower(${column}) like lower(${pattern}) escape '\\'`
}
