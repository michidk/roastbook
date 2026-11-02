import { sql } from 'drizzle-orm'
import { shots } from '@/db/schema'
import type { ShotSortKey } from '@/modules/brews/read-models'

export function shotSortExpression(sort: ShotSortKey) {
  switch (sort) {
    case 'bean':
      // Relational queries remap Drizzle column objects to their outer alias.
      // Keep the correlated subquery's bean identifiers literal so only the
      // outer brew column is remapped to the query alias.
      return sql`coalesce((select "beans"."name" from "beans" where "beans"."owner_id" = ${shots.ownerId} and "beans"."id" = ${shots.beanId}), '')`
    case 'dose':
      return sql`cast(${shots.doseGrams} as numeric)`
    case 'yield':
      return sql`cast(${shots.yieldGrams} as numeric)`
    case 'time':
      return sql`cast(${shots.shotTimeSeconds} as numeric)`
    case 'rating':
      return shots.rating
    case 'date':
      return shots.brewedAt
  }
}
