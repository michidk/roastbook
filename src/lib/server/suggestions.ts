import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, isNotNull, max } from 'drizzle-orm'
import { db } from '@/db'
import { beans, brewingMethods, drinkTypes, shots } from '@/db/schema'

type Suggestion = {
  readonly id: number
  readonly name: string
}

const lastUsedAt = max(shots.brewedAt).as('last_used_at')
const lastUsedShotId = max(shots.id).as('last_used_shot_id')

function mergeSuggestions(
  recentlyUsed: readonly Suggestion[],
  newest: readonly Suggestion[],
) {
  const seen = new Set(recentlyUsed.map((suggestion) => suggestion.id))
  return [
    ...recentlyUsed,
    ...newest.filter((suggestion) => !seen.has(suggestion.id)),
  ]
}

async function loadSuggestions(
  recentlyUsedQuery: PromiseLike<readonly Suggestion[]>,
  newestQuery: PromiseLike<readonly Suggestion[]>,
) {
  const [recentlyUsed, newest] = await Promise.all([
    recentlyUsedQuery,
    newestQuery,
  ])
  return mergeSuggestions(recentlyUsed, newest)
}

export const getBeanSuggestions = createServerFn({ method: 'GET' }).handler(
  () =>
    loadSuggestions(
      db
        .select({ id: beans.id, name: beans.name, lastUsedAt })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(eq(beans.isArchived, false))
        .groupBy(beans.id, beans.name)
        .orderBy(desc(lastUsedAt))
        .limit(5),
      db
        .select({ id: beans.id, name: beans.name })
        .from(beans)
        .where(eq(beans.isArchived, false))
        .orderBy(desc(beans.createdAt))
        .limit(2),
    ),
)

export const getBrewingMethodSuggestions = createServerFn({
  method: 'GET',
}).handler(() =>
  db
    .select({
      id: brewingMethods.id,
      name: brewingMethods.name,
      lastUsedAt,
      lastUsedShotId,
    })
    .from(shots)
    .innerJoin(brewingMethods, eq(shots.brewingMethodId, brewingMethods.id))
    .groupBy(brewingMethods.id, brewingMethods.name)
    .orderBy(desc(lastUsedAt), desc(lastUsedShotId))
    .limit(5),
)

export const getDrinkTypeSuggestions = createServerFn({
  method: 'GET',
}).handler(() =>
  db
    .select({ id: drinkTypes.id, name: drinkTypes.name, uses: count(shots.id) })
    .from(shots)
    .innerJoin(drinkTypes, eq(shots.drinkTypeId, drinkTypes.id))
    .where(eq(drinkTypes.isArchived, false))
    .groupBy(drinkTypes.id, drinkTypes.name)
    .orderBy(desc(count(shots.id)), asc(drinkTypes.name))
    .limit(5),
)

export const getLastBeansByBrewingMethod = createServerFn({
  method: 'GET',
}).handler(() =>
  db
    .selectDistinctOn([shots.brewingMethodId], {
      brewingMethodId: shots.brewingMethodId,
      beanId: shots.beanId,
    })
    .from(shots)
    .innerJoin(beans, eq(shots.beanId, beans.id))
    .where(and(isNotNull(shots.beanId), eq(beans.isArchived, false)))
    .orderBy(asc(shots.brewingMethodId), desc(shots.brewedAt), desc(shots.id)),
)
