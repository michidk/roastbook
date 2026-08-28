import { sql } from 'drizzle-orm'
import { shots } from '@/db/schema'

export const SHOT_SORT_VALUES = [
  'date',
  'bean',
  'dose',
  'yield',
  'time',
  'rating',
] as const

export type ShotSortKey = (typeof SHOT_SORT_VALUES)[number]

export function shotSortExpression(sort: ShotSortKey) {
  switch (sort) {
    case 'bean':
      // Relational queries remap Drizzle column objects to their outer alias.
      // Keep the correlated subquery's bean identifiers literal so only the
      // outer brew column is remapped to the query alias.
      return sql`coalesce((select "beans"."name" from "beans" where "beans"."id" = ${shots.beanId}), '')`
    case 'dose':
      return shots.doseGrams
    case 'yield':
      return shots.yieldGrams
    case 'time':
      return shots.shotTimeSeconds
    case 'rating':
      return shots.rating
    case 'date':
      return shots.brewedAt
  }
}
