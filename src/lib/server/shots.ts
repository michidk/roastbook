import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
  notInArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  beans,
  brewingMethods,
  recipes,
  shotAccessoryGear,
  shots,
  shotTasteTags,
  tasteTags,
} from '@/db/schema'
import { resolvePagination } from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { recipeTargetSchema } from '@/lib/recipe-target'
import {
  replaceShotAccessoryGear,
  withAccessoryGearIds,
} from '@/lib/server/accessory-gear.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { readTasteProfile } from '@/lib/server/settings.server'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/lib/server/shot-parameter-projection'
import { saveShotToRecipeInTransaction } from '@/lib/server/shot-recipes.server'
import {
  positiveIdSchema,
  shotCreateSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { LEGACY_SENSORY_TASTE_TAG_NAMES } from '@/lib/taste-tags'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'

type ShotCreateCandidate = ReturnType<typeof shotCreateSchema.parse>
const SHOTS_PAGE_SIZE = 25
const SHOT_GROUPS_PAGE_SIZE = 8
const BEAN_SHOT_CHART_LIMIT = 100

const shotListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  sort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  methodId: positiveIdSchema.optional(),
  rating: z.number().int().min(0).max(5).optional(),
  beanId: z.number().int().min(0).max(100_000).optional(),
})

const relatedShotListSchema = shotListSchema.omit({ beanId: true }).extend({
  entityId: positiveIdSchema,
})

const createShotWithRecipeSchema = z.object({
  shot: shotCreateSchema,
  target: recipeTargetSchema,
})

const shotGroupListSchema = shotListSchema.pick({
  page: true,
  methodId: true,
  rating: true,
})

class ShotInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShotInputError'
  }
}

type ShotTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function getBrewingMethod(tx: ShotTransaction, brewingMethodId: number) {
  const method = await tx.query.brewingMethods.findFirst({
    where: eq(brewingMethods.id, brewingMethodId),
  })
  if (!method) throw new ShotInputError('Brewing method not found')
  return method
}

async function assertRecipeMatchesMethod(
  tx: ShotTransaction,
  recipeId: number | null | undefined,
  brewingMethodId: number,
) {
  if (!recipeId) return
  const recipe = await tx.query.recipes.findFirst({
    columns: { brewingMethodId: true },
    where: eq(recipes.id, recipeId),
  })
  if (!recipe) throw new ShotInputError('Recipe not found')
  if (recipe.brewingMethodId !== brewingMethodId) {
    throw new ShotInputError('Recipe does not use the selected brewing method')
  }
}

function getShotValues(
  data: ShotCreateCandidate,
  enabledParameters: readonly string[],
) {
  return {
    brewingMethodId: data.brewingMethodId,
    brewedAt: data.brewedAt,
    recipeId: data.recipeId ?? null,
    beanId: data.beanId ?? null,
    ...projectShotParameters(data, enabledParameters),
    rating: data.rating ?? null,
    extractionBalance: data.extractionBalance ?? null,
    bitterness: data.bitterness ?? null,
    acidity: data.acidity ?? null,
    sweetness: data.sweetness ?? null,
    body: data.body ?? null,
    astringency: data.astringency ?? null,
    notes: data.notes ?? null,
  }
}

const shotRelations = {
  bean: true,
  recipe: true,
  machine: true,
  grinder: true,
  basket: true,
  brewingMethod: true,
  accessoryGearLinks: { columns: { gearId: true } },
  tasteTags: { with: { tasteTag: true } },
  images: true,
} as const

function shotFilterCondition(methodId?: number, rating?: number) {
  return and(
    methodId ? eq(shots.brewingMethodId, methodId) : undefined,
    rating === undefined
      ? undefined
      : rating === 0
        ? isNull(shots.rating)
        : eq(shots.rating, rating),
  )
}

function shotSortExpression(sort: z.infer<typeof shotListSchema>['sort']) {
  switch (sort) {
    case 'bean':
      return sql`coalesce((select ${beans.name} from ${beans} where ${beans.id} = ${shots.beanId}), '')`
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

function shotBeanCondition(beanId: number | undefined) {
  if (beanId === undefined) return undefined
  return beanId === 0 ? isNull(shots.beanId) : eq(shots.beanId, beanId)
}

type ShotSortKey = z.infer<typeof shotListSchema>['sort']

/**
 * The rating filter and the rating sort only mean something while the overall
 * rating is part of the taste profile. A search parameter left over from before
 * it was switched off must not keep narrowing or reordering the list, since the
 * controls that produced it are no longer rendered.
 */
async function ratingAwareScope(
  rating: number | undefined,
  sort: ShotSortKey,
): Promise<{ rating: number | undefined; sort: ShotSortKey }> {
  const { overallRating } = await readTasteProfile()
  if (overallRating) return { rating, sort }
  return { rating: undefined, sort: sort === 'rating' ? 'date' : sort }
}

async function loadShotPage(
  data: Omit<z.infer<typeof shotListSchema>, 'beanId'>,
  scope?: SQL,
) {
  const scoped = await ratingAwareScope(data.rating, data.sort)
  const filters = shotFilterCondition(data.methodId, scoped.rating)
  const where = scope && filters ? and(scope, filters) : (scope ?? filters)
  const countRows = await db.select({ value: count() }).from(shots).where(where)
  const totalItems = countRows[0]?.value ?? 0
  const pagination = resolvePagination(totalItems, data.page, SHOTS_PAGE_SIZE)
  const { page } = pagination
  const sortExpression = shotSortExpression(scoped.sort)
  const order =
    data.direction === 'asc' ? asc(sortExpression) : desc(sortExpression)
  const items = await db.query.shots.findMany({
    where,
    orderBy: [order, desc(shots.id)],
    limit: SHOTS_PAGE_SIZE,
    offset: (page - 1) * SHOTS_PAGE_SIZE,
    columns: {
      id: true,
      brewedAt: true,
      doseGrams: true,
      yieldGrams: true,
      shotTimeSeconds: true,
      rating: true,
    },
    with: {
      bean: { columns: { id: true, name: true }, with: { images: true } },
      brewingMethod: { columns: { id: true, name: true } },
      recipe: { columns: { id: true, name: true } },
    },
  })

  return { items, ...pagination }
}

export const getShotPage = createServerFn({ method: 'GET' })
  .validator(shotListSchema)
  .handler(async ({ data }) => {
    const [page, scopeLabel] = await Promise.all([
      loadShotPage(data, shotBeanCondition(data.beanId)),
      data.beanId === undefined
        ? null
        : data.beanId === 0
          ? 'No bean recorded'
          : db.query.beans
              .findFirst({
                where: eq(beans.id, data.beanId),
                columns: { name: true },
              })
              .then((bean) => bean?.name ?? 'Unknown beans'),
    ])

    return { ...page, scopeLabel }
  })

export const getBeanShotPage = createServerFn({ method: 'GET' })
  .validator(relatedShotListSchema)
  .handler(async ({ data }) =>
    loadShotPage(data, eq(shots.beanId, data.entityId)),
  )

export const getGearShotPage = createServerFn({ method: 'GET' })
  .validator(relatedShotListSchema)
  .handler(async ({ data }) =>
    loadShotPage(
      data,
      or(
        eq(shots.machineId, data.entityId),
        eq(shots.grinderId, data.entityId),
        eq(shots.basketId, data.entityId),
        sql`exists (
          select 1 from ${shotAccessoryGear}
          where "brew_accessory_gear"."brew_id" = ${shots.id}
            and "brew_accessory_gear"."gear_id" = ${data.entityId}
        )`,
      ),
    ),
  )

export const getBeanShotAnalytics = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: beanId }) => {
    const tagUsageCount = sql<number>`count(${shotTasteTags.id})::int`
    const [totals, chartShots, topTasteTags] = await Promise.all([
      db
        .select({
          totalShots: count(),
          usedWeightGrams: sql<string>`coalesce(sum(${shots.doseGrams}), 0)::text`,
        })
        .from(shots)
        .where(eq(shots.beanId, beanId)),
      db.query.shots.findMany({
        where: eq(shots.beanId, beanId),
        orderBy: [desc(shots.brewedAt), desc(shots.id)],
        limit: BEAN_SHOT_CHART_LIMIT,
        columns: {
          id: true,
          brewedAt: true,
          doseGrams: true,
          yieldGrams: true,
          grindSetting: true,
          shotTimeSeconds: true,
        },
      }),
      db
        .select({
          id: tasteTags.id,
          name: tasteTags.name,
          usageCount: tagUsageCount,
        })
        .from(shotTasteTags)
        .innerJoin(shots, eq(shotTasteTags.shotId, shots.id))
        .innerJoin(tasteTags, eq(shotTasteTags.tasteTagId, tasteTags.id))
        .where(
          and(
            eq(shots.beanId, beanId),
            notInArray(tasteTags.name, [...LEGACY_SENSORY_TASTE_TAG_NAMES]),
          ),
        )
        .groupBy(tasteTags.id, tasteTags.name)
        .orderBy(desc(tagUsageCount), asc(tasteTags.name))
        .limit(5),
    ])

    return {
      totalShots: totals[0]?.totalShots ?? 0,
      usedWeightGrams: totals[0]?.usedWeightGrams ?? '0',
      chartShots,
      topTasteTags,
    }
  })

export const getShotGroups = createServerFn({ method: 'GET' })
  .validator(shotGroupListSchema)
  .handler(async ({ data }) => {
    const { rating } = await ratingAwareScope(data.rating, 'date')
    const where = shotFilterCondition(data.methodId, rating)
    const groupKey = sql<number>`coalesce(${shots.beanId}, 0)`
    const countRows = await db
      .select({ value: sql<number>`count(distinct ${groupKey})::int` })
      .from(shots)
      .where(where)
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(
      totalItems,
      data.page,
      SHOT_GROUPS_PAGE_SIZE,
    )
    const { page } = pagination
    const summaries = await db
      .select({
        beanId: shots.beanId,
        beanName: beans.name,
        latestShotAt: sql<Date>`max(${shots.brewedAt})`,
        totalShots: sql<number>`count(*)::int`,
      })
      .from(shots)
      .leftJoin(beans, eq(shots.beanId, beans.id))
      .where(where)
      .groupBy(shots.beanId, beans.name)
      .orderBy(desc(sql`max(${shots.brewedAt})`))
      .limit(SHOT_GROUPS_PAGE_SIZE)
      .offset((page - 1) * SHOT_GROUPS_PAGE_SIZE)

    const groups = await Promise.all(
      summaries.map(async (summary) => ({
        key: summary.beanId ? `bean-${summary.beanId}` : 'no-bean',
        bean: summary.beanId
          ? { id: summary.beanId, name: summary.beanName ?? 'Unknown beans' }
          : null,
        label: summary.beanName ?? 'No bean recorded',
        totalShots: summary.totalShots,
        shots: await db.query.shots.findMany({
          where: and(
            where,
            summary.beanId
              ? eq(shots.beanId, summary.beanId)
              : isNull(shots.beanId),
          ),
          orderBy: [desc(shots.brewedAt), desc(shots.id)],
          limit: SHOTS_PAGE_SIZE,
          columns: {
            id: true,
            brewedAt: true,
            doseGrams: true,
            yieldGrams: true,
            shotTimeSeconds: true,
            rating: true,
          },
          with: {
            recipe: { columns: { id: true, name: true } },
            bean: {
              columns: { id: true, name: true },
              with: { images: true },
            },
            brewingMethod: { columns: { id: true, name: true } },
          },
        }),
      })),
    )

    return {
      groups,
      ...pagination,
    }
  })

export const getShot = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const shot = await db.query.shots.findFirst({
      where: eq(shots.id, id),
      with: shotRelations,
    })
    return shot ? withAccessoryGearIds(shot) : undefined
  })

async function createShotInTransaction(
  tx: ShotTransaction,
  data: ShotCreateCandidate,
) {
  const method = await getBrewingMethod(tx, data.brewingMethodId)
  await assertRecipeMatchesMethod(tx, data.recipeId, data.brewingMethodId)
  const [shot] = await tx
    .insert(shots)
    .values(getShotValues(data, method.enabledParameters))
    .returning()
  const persistedShot = expectReturnedRow(shot, 'Shot')

  await replaceShotAccessoryGear(
    tx,
    persistedShot.id,
    projectAccessoryGearIds(data, method.enabledParameters),
  )

  if (data.tasteTagIds && data.tasteTagIds.length > 0) {
    await tx.insert(shotTasteTags).values(
      [...new Set(data.tasteTagIds)].map((tasteTagId) => ({
        shotId: persistedShot.id,
        tasteTagId,
      })),
    )
  }
  return persistedShot
}

function validateShotCreate(input: unknown) {
  const data = shotCreateSchema.parse(input)
  assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
  return data
}

export const createShot = createServerFn({ method: 'POST' })
  .validator(validateShotCreate)
  .handler(async ({ data }) =>
    db.transaction((tx) => createShotInTransaction(tx, data)),
  )

export const createShotWithRecipe = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = createShotWithRecipeSchema.parse(input)
    return { ...data, shot: validateShotCreate(data.shot) }
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const shot = await createShotInTransaction(tx, data.shot)
      const recipe = await saveShotToRecipeInTransaction(
        tx,
        shot.id,
        data.target,
      )
      return { shot, recipe }
    }),
  )

export const updateShot = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = shotUpdateSchema.parse(input)
    assertValidUpdate(getShotUpdateErrors(data))
    return data
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const method = await getBrewingMethod(tx, data.brewingMethodId)
      await assertRecipeMatchesMethod(tx, data.recipeId, data.brewingMethodId)
      const { id, tasteTagIds } = data
      const [shot] = await tx
        .update(shots)
        .set({
          ...getShotValues(data, method.enabledParameters),
          updatedAt: new Date(),
        })
        .where(eq(shots.id, id))
        .returning()
      const persistedShot = expectReturnedRow(shot, 'Shot')

      await replaceShotAccessoryGear(
        tx,
        id,
        projectAccessoryGearIds(data, method.enabledParameters),
      )

      if (tasteTagIds !== undefined) {
        await tx.delete(shotTasteTags).where(eq(shotTasteTags.shotId, id))
        if (tasteTagIds.length > 0) {
          await tx.insert(shotTasteTags).values(
            [...new Set(tasteTagIds)].map((tasteTagId) => ({
              shotId: id,
              tasteTagId,
            })),
          )
        }
      }
      return persistedShot
    }),
  )

export const deleteShot = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('shots', id))

export const getLastShotForBeanAndMethod = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      beanId: positiveIdSchema,
      brewingMethodId: positiveIdSchema,
    }),
  )
  .handler(async ({ data }) => {
    const shot = await db.query.shots.findFirst({
      where: and(
        eq(shots.beanId, data.beanId),
        eq(shots.brewingMethodId, data.brewingMethodId),
      ),
      orderBy: [desc(shots.brewedAt)],
      with: {
        brewingMethod: true,
        accessoryGearLinks: { columns: { gearId: true } },
      },
    })
    return shot ? withAccessoryGearIds(shot) : undefined
  })
