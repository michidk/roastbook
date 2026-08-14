import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, brewingMethods, shots, shotTasteTags } from '@/db/schema'
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

const shotListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date'),
  direction: z.enum(['asc', 'desc']).default('desc'),
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

function getShotValues(
  data: ShotCreateCandidate,
  enabledParameters: readonly string[],
) {
  return {
    brewingMethodId: data.brewingMethodId,
    beanId: data.beanId ?? null,
    ...projectShotParameters(data, enabledParameters),
    rating: data.rating ?? null,
    notes: data.notes ?? null,
  }
}

const shotRelations = {
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

export const getShotPage = createServerFn({ method: 'GET' })
  .validator(shotListSchema)
  .handler(async ({ data }) => {
    const where = shotSearchCondition(data.query)
    const [{ value: totalItems }] = await db
      .select({ value: count() })
      .from(shots)
      .where(where)
    const totalPages = Math.max(1, Math.ceil(totalItems / SHOTS_PAGE_SIZE))
    const page = Math.min(data.page, totalPages)
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
        createdAt: true,
        doseGrams: true,
        yieldGrams: true,
        shotTimeSeconds: true,
        rating: true,
      },
      with: {
        bean: { columns: { id: true, name: true }, with: { images: true } },
      },
    })

    return { items, page, pageSize: SHOTS_PAGE_SIZE, totalItems, totalPages }
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
            createdAt: true,
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
      const { id, tasteTagIds } = data
      const [shot] = await tx
        .update(shots)
        .set({
          ...getShotValues(data, method.enabledParameters),
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

export const getShotsByBean = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: beanId }) =>
    db.query.shots.findMany({
      where: eq(shots.beanId, beanId),
      orderBy: [desc(shots.createdAt)],
      with: shotRelations,
    }),
  )

export const getShotsByGear = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: gearId }) =>
    db.query.shots.findMany({
      where: or(
        eq(shots.machineId, gearId),
        eq(shots.grinderId, gearId),
        eq(shots.basketId, gearId),
        sql`${gearId} = any(${shots.accessoryGearIds})`,
      ),
      orderBy: [desc(shots.createdAt)],
      with: shotRelations,
    }),
  )
