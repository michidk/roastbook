import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  beans,
  brewingMethods,
  recipes,
  shotAccessoryGear,
  shots,
  shotTasteTags,
} from '@/db/schema'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import {
  replaceShotAccessoryGear,
  withAccessoryGearIds,
} from '@/lib/server/accessory-gear.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/lib/server/shot-parameter-projection'
import {
  positiveIdSchema,
  shotCreateSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'

type ShotCreateCandidate = ReturnType<typeof shotCreateSchema.parse>
const SHOTS_PAGE_SIZE = 25
const SHOT_GROUPS_PAGE_SIZE = 8

const shotListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  methodId: positiveIdSchema.optional(),
  rating: z.number().int().min(0).max(5).optional(),
})

const shotGroupListSchema = shotListSchema.pick({
  page: true,
  query: true,
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

function shotSearchCondition(
  query: string,
  methodId?: number,
  rating?: number,
) {
  const pattern = query ? escapedContainsPattern(query) : null
  const textCondition = pattern
    ? or(
        sql`exists (
          select 1 from ${beans}
          where ${beans.id} = ${shots.beanId}
            and ${beans.name} ilike ${pattern} escape '\\'
        )`,
        sql`exists (
          select 1 from ${brewingMethods}
          where ${brewingMethods.id} = ${shots.brewingMethodId}
            and ${brewingMethods.name} ilike ${pattern} escape '\\'
        )`,
      )
    : undefined
  return and(
    textCondition,
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

export const getShotPage = createServerFn({ method: 'GET' })
  .validator(shotListSchema)
  .handler(async ({ data }) => {
    const where = shotSearchCondition(data.query, data.methodId, data.rating)
    const countRows = await db
      .select({ value: count() })
      .from(shots)
      .where(where)
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(totalItems, data.page, SHOTS_PAGE_SIZE)
    const { page } = pagination
    const sortExpression = shotSortExpression(data.sort)
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
      },
    })

    return { items, ...pagination }
  })

export const getShotGroups = createServerFn({ method: 'GET' })
  .validator(shotGroupListSchema)
  .handler(async ({ data }) => {
    const where = shotSearchCondition(data.query, data.methodId, data.rating)
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

export const createShot = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = shotCreateSchema.parse(input)
    assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
    return data
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
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

export const getShotsByBean = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: beanId }) => {
    const results = await db.query.shots.findMany({
      where: eq(shots.beanId, beanId),
      orderBy: [desc(shots.brewedAt)],
      with: shotRelations,
    })
    return results.map(withAccessoryGearIds)
  })

export const getShotsByGear = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: gearId }) => {
    const results = await db.query.shots.findMany({
      where: or(
        eq(shots.machineId, gearId),
        eq(shots.grinderId, gearId),
        eq(shots.basketId, gearId),
        sql`exists (
          select 1 from ${shotAccessoryGear}
          where ${shotAccessoryGear.shotId} = ${shots.id}
            and ${shotAccessoryGear.gearId} = ${gearId}
        )`,
      ),
      orderBy: [desc(shots.brewedAt)],
      with: shotRelations,
    })
    return results.map(withAccessoryGearIds)
  })
