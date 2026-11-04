import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  isNotNull,
  max,
  notInArray,
  sql,
} from 'drizzle-orm'
import {
  beanPurchases,
  beans,
  brewingMethods,
  drinkTypes,
  shots,
  shotTasteTags,
  tasteTags,
} from '@/db/schema'
import { journalRead } from '@/journal/function'
import { db, owned } from '@/journal/platform/database'
import {
  FREQUENT_TASTE_TAG_LIMIT,
  LEGACY_SENSORY_TASTE_TAG_NAMES,
} from '@/lib/taste-tags'

const hasActivePurchase = () =>
  exists(
    db
      .select({ id: beanPurchases.id })
      .from(beanPurchases)
      .where(
        owned(
          beanPurchases,
          and(
            eq(beanPurchases.beanId, beans.id),
            eq(beanPurchases.isArchived, false),
          ),
        ),
      ),
  )

type Suggestion = {
  readonly id: number
  readonly purchaseId?: number
  readonly name: string
}

const lastUsedAt = () => max(shots.brewedAt).as('last_used_at')
const lastUsedShotId = () => max(shots.id).as('last_used_shot_id')

function mergeSuggestions(
  recentlyUsed: readonly Suggestion[],
  newest: readonly Suggestion[],
) {
  const seen = new Set(
    recentlyUsed.map((suggestion) => suggestion.purchaseId ?? suggestion.id),
  )
  return [
    ...recentlyUsed,
    ...newest.filter(
      (suggestion) => !seen.has(suggestion.purchaseId ?? suggestion.id),
    ),
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

export const getBeanSuggestions = journalRead(
  'suggestions/getBeanSuggestions',
).handler(() =>
  loadSuggestions(
    db
      .select({
        id: beans.id,
        purchaseId: beanPurchases.id,
        name: beans.name,
        lastUsedAt: lastUsedAt(),
      })
      .from(shots)
      .innerJoin(beans, eq(shots.beanId, beans.id))
      .innerJoin(beanPurchases, eq(shots.beanPurchaseId, beanPurchases.id))
      .where(owned(shots, eq(beanPurchases.isArchived, false)))
      .groupBy(beans.id, beanPurchases.id, beans.name)
      .orderBy(desc(lastUsedAt()))
      .limit(5),
    db
      .select({
        id: beans.id,
        purchaseId: beanPurchases.id,
        name: beans.name,
      })
      .from(beanPurchases)
      .innerJoin(beans, eq(beanPurchases.beanId, beans.id))
      .where(owned(beanPurchases, eq(beanPurchases.isArchived, false)))
      .orderBy(desc(beanPurchases.createdAt))
      .limit(2),
  ),
)

export const getBrewingMethodSuggestions = journalRead(
  'suggestions/getBrewingMethodSuggestions',
).handler(() =>
  db
    .select({
      id: brewingMethods.id,
      name: brewingMethods.name,
      lastUsedAt: lastUsedAt(),
      lastUsedShotId: lastUsedShotId(),
    })
    .from(shots)
    .where(owned(shots))
    .innerJoin(brewingMethods, eq(shots.brewingMethodId, brewingMethods.id))
    .groupBy(brewingMethods.id, brewingMethods.name)
    .orderBy(desc(lastUsedAt()), desc(lastUsedShotId()))
    .limit(5),
)

export const getDrinkTypeSuggestions = journalRead(
  'suggestions/getDrinkTypeSuggestions',
).handler(() =>
  db
    .select({ id: drinkTypes.id, name: drinkTypes.name, uses: count(shots.id) })
    .from(shots)
    .innerJoin(drinkTypes, eq(shots.drinkTypeId, drinkTypes.id))
    .where(owned(shots, eq(drinkTypes.isArchived, false)))
    .groupBy(drinkTypes.id, drinkTypes.name)
    .orderBy(desc(count(shots.id)), asc(drinkTypes.name))
    .limit(5),
)

/** The most-used flavor tags, so the tag picker can lead with them. */
export const getTasteTagSuggestions = journalRead(
  'suggestions/getTasteTagSuggestions',
).handler(() =>
  db
    .select({ id: tasteTags.id, uses: count(shotTasteTags.id) })
    .from(shotTasteTags)
    .innerJoin(tasteTags, eq(shotTasteTags.tasteTagId, tasteTags.id))
    .where(
      owned(
        shotTasteTags,
        notInArray(tasteTags.name, [...LEGACY_SENSORY_TASTE_TAG_NAMES]),
      ),
    )
    .groupBy(tasteTags.id, tasteTags.name)
    .orderBy(desc(count(shotTasteTags.id)), asc(tasteTags.name))
    .limit(FREQUENT_TASTE_TAG_LIMIT),
)

export const getLastBeansByBrewingMethod = journalRead(
  'suggestions/getLastBeansByBrewingMethod',
).handler(() =>
  db
    .select({
      brewingMethodId: shots.brewingMethodId,
      beanId: shots.beanId,
      beanPurchaseId: shots.beanPurchaseId,
    })
    .from(shots)
    .innerJoin(beans, eq(shots.beanId, beans.id))
    .where(
      owned(
        shots,
        and(
          isNotNull(shots.beanId),
          hasActivePurchase(),
          sql`not exists (
      select 1 from brews as newer
      where newer.owner_id = ${shots.ownerId}
        and newer.brewing_method_id = ${shots.brewingMethodId}
        and newer.bean_id is not null
        and exists (select 1 from bean_purchases as active_bag
          where active_bag.owner_id = newer.owner_id
            and active_bag.bean_id = newer.bean_id and active_bag.is_archived = false)
        and (newer.brewed_at > ${shots.brewedAt}
          or (newer.brewed_at = ${shots.brewedAt} and newer.id > ${shots.id}))
    )`,
        ),
      ),
    )
    .orderBy(asc(shots.brewingMethodId), desc(shots.brewedAt), desc(shots.id)),
)
