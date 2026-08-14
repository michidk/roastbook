import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
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
  shots,
  shotTasteTags,
  tasteTags,
} from '@/db/schema'
import { getPaginationWindow } from '@/lib/pagination'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { projectShotParameters } from '@/lib/server/shot-parameter-projection'
import {
  positiveIdSchema,
  shotCreateSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'

type ShotCreateCandidate = ReturnType<typeof shotCreateSchema.parse>
const SHOTS_PAGE_SIZE = 25
const SHOT_GROUPS_PAGE_SIZE = 8
const BEAN_SHOT_CHART_LIMIT = 100

const shotListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  beanId: z.number().int().min(0).max(100_000).optional(),
})

const relatedShotListSchema = shotListSchema.omit({ beanId: true }).extend({
  entityId: positiveIdSchema,
})

const shotGroupListSchema = shotListSchema.pick({
  page: true,
  query: true,
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

async function validateRecipeForMethod(
  tx: ShotTransaction,
  recipeId: number,
  brewingMethodId: number,
) {
  const recipe = await tx.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    columns: { brewingMethodId: true },
  })
  if (!recipe) throw new ShotInputError('Recipe not found')
  if (recipe.brewingMethodId !== brewingMethodId) {
    throw new ShotInputError('Recipe does not use this brewing method')
  }
}

function getShotValues(
  data: ShotCreateCandidate,
  enabledParameters: readonly string[],
) {
  return {
    ...(data.recipeId !== undefined ? { recipeId: data.recipeId } : {}),
    brewingMethodId: data.brewingMethodId,
    beanId: data.beanId ?? null,
    ...projectShotParameters(data, enabledParameters),
    rating: data.rating ?? null,
    bitterness: data.bitterness ?? null,
    acidity: data.acidity ?? null,
    sweetness: data.sweetness ?? null,
    body: data.body ?? null,
    astringency: data.astringency ?? null,
    notes: data.notes ?? null,
  }
}

const shotRelations = {
  recipe: true,
  bean: true,
  machine: true,
  grinder: true,
  basket: true,
  brewingMethod: true,
  tasteTags: { with: { tasteTag: true } },
  images: true,
} as const

function shotSearchCondition(query: string) {
  if (!query) return undefined
  const pattern = `%${query.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
  return sql`exists (
    select 1 from ${beans}
    where ${beans.id} = ${shots.beanId}
      and ${beans.name} ilike ${pattern} escape '\\'
  )`
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
      return shots.createdAt
  }
}

function shotBeanCondition(beanId: number | undefined) {
  if (beanId === undefined) return undefined
  return beanId === 0 ? isNull(shots.beanId) : eq(shots.beanId, beanId)
}

async function loadShotPage(data: z.infer<typeof shotListSchema>, scope?: SQL) {
  const search = shotSearchCondition(data.query)
  const where = scope && search ? and(scope, search) : (scope ?? search)
  const [{ value: totalItems }] = await db
    .select({ value: count() })
    .from(shots)
    .where(where)
  const pagination = getPaginationWindow(totalItems, data.page, SHOTS_PAGE_SIZE)
  const sortExpression = shotSortExpression(data.sort)
  const order =
    data.direction === 'asc' ? asc(sortExpression) : desc(sortExpression)
  const items = await db.query.shots.findMany({
    where,
    orderBy: [order, desc(shots.id)],
    limit: pagination.pageSize,
    offset: pagination.offset,
    columns: {
      id: true,
      recipeId: true,
      createdAt: true,
      doseGrams: true,
      yieldGrams: true,
      shotTimeSeconds: true,
      rating: true,
    },
    with: {
      recipe: { columns: { id: true, name: true } },
      bean: { columns: { id: true, name: true }, with: { images: true } },
    },
  })

  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    totalPages: pagination.totalPages,
  }
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
        sql`${data.entityId} = any(${shots.accessoryGearIds})`,
      ),
    ),
  )

export const getBeanShotAnalytics = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: beanId }) => {
    const tagUsageCount = sql<number>`count(${shotTasteTags.id})::int`
    const [[{ totalShots, usedWeightGrams }], chartShots, topTasteTags] =
      await Promise.all([
        db
          .select({
            totalShots: count(),
            usedWeightGrams: sql<string>`coalesce(sum(${shots.doseGrams}), 0)::text`,
          })
          .from(shots)
          .where(eq(shots.beanId, beanId)),
        db.query.shots.findMany({
          where: eq(shots.beanId, beanId),
          orderBy: [desc(shots.createdAt), desc(shots.id)],
          limit: BEAN_SHOT_CHART_LIMIT,
          columns: {
            id: true,
            createdAt: true,
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
          .where(eq(shots.beanId, beanId))
          .groupBy(tasteTags.id, tasteTags.name)
          .orderBy(desc(tagUsageCount), asc(tasteTags.name))
          .limit(5),
      ])

    return {
      totalShots,
      usedWeightGrams,
      chartShots,
      topTasteTags,
    }
  })

export const getShotGroups = createServerFn({ method: 'GET' })
  .validator(shotGroupListSchema)
  .handler(async ({ data }) => {
    const where = shotSearchCondition(data.query)
    const groupKey = sql<number>`coalesce(${shots.beanId}, 0)`
    const [{ value: totalItems }] = await db
      .select({ value: sql<number>`count(distinct ${groupKey})::int` })
      .from(shots)
      .where(where)
    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / SHOT_GROUPS_PAGE_SIZE),
    )
    const page = Math.min(data.page, totalPages)
    const summaries = await db
      .select({
        beanId: shots.beanId,
        beanName: beans.name,
        latestShotAt: sql<Date>`max(${shots.createdAt})`,
        totalShots: sql<number>`count(*)::int`,
      })
      .from(shots)
      .leftJoin(beans, eq(shots.beanId, beans.id))
      .where(where)
      .groupBy(shots.beanId, beans.name)
      .orderBy(desc(sql`max(${shots.createdAt})`))
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
          where: summary.beanId
            ? eq(shots.beanId, summary.beanId)
            : isNull(shots.beanId),
          orderBy: [desc(shots.createdAt), desc(shots.id)],
          limit: SHOTS_PAGE_SIZE,
          columns: {
            id: true,
            recipeId: true,
            createdAt: true,
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
          },
        }),
      })),
    )

    return {
      groups,
      page,
      pageSize: SHOT_GROUPS_PAGE_SIZE,
      totalItems,
      totalPages,
    }
  })

export const getShot = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.query.shots.findFirst({
      where: eq(shots.id, id),
      with: shotRelations,
    }),
  )

export const createShot = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = shotCreateSchema.parse(input)
    assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
    return data
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const method = await getBrewingMethod(tx, data.brewingMethodId)
      if (data.recipeId) {
        await validateRecipeForMethod(tx, data.recipeId, data.brewingMethodId)
      }
      const [shot] = await tx
        .insert(shots)
        .values(getShotValues(data, method.enabledParameters))
        .returning()
      if (!shot) return null

      if (data.tasteTagIds && data.tasteTagIds.length > 0) {
        await tx.insert(shotTasteTags).values(
          [...new Set(data.tasteTagIds)].map((tasteTagId) => ({
            shotId: shot.id,
            tasteTagId,
          })),
        )
      }
      return shot
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
      const existingShot = await tx.query.shots.findFirst({
        where: eq(shots.id, data.id),
        columns: { recipeId: true },
        with: {
          recipe: { columns: { brewingMethodId: true } },
        },
      })
      if (!existingShot) throw new ShotInputError('Shot not found')
      if (data.recipeId) {
        await validateRecipeForMethod(tx, data.recipeId, data.brewingMethodId)
      }
      const shouldUnlinkRecipe =
        data.recipeId === undefined &&
        existingShot.recipe !== null &&
        existingShot.recipe.brewingMethodId !== data.brewingMethodId
      const { id, tasteTagIds } = data
      const [shot] = await tx
        .update(shots)
        .set({
          ...getShotValues(data, method.enabledParameters),
          ...(shouldUnlinkRecipe ? { recipeId: null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(shots.id, id))
        .returning()

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
      return shot
    }),
  )

export const deleteShot = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('shots', id))

export const getLastShotForBean = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: beanId }) =>
    db.query.shots.findFirst({
      where: eq(shots.beanId, beanId),
      orderBy: [desc(shots.createdAt)],
      with: { brewingMethod: true },
    }),
  )
