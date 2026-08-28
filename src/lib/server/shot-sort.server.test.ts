import { describe, expect, test } from 'bun:test'
import { mapColumnsInSQLToAlias, SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { shotSortExpression } from '@/lib/server/shot-sort.server'

describe('brew collection sorting', () => {
  test('keeps bean identifiers separate from the relational brew alias', () => {
    const beanSort = shotSortExpression('bean')
    expect(beanSort).toBeInstanceOf(SQL)
    if (!(beanSort instanceof SQL)) throw new Error('Expected a SQL expression')

    const expression = mapColumnsInSQLToAlias(beanSort, 'shots')
    const query = new PgDialect().sqlToQuery(expression)

    expect(query.sql).toBe(
      `coalesce((select "beans"."name" from "beans" where "beans"."id" = "shots"."bean_id"), '')`,
    )
    expect(query.params).toEqual([])
  })
})
