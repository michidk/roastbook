import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, roasters } from '@/db/schema'
import { expectReturnedRow } from '@/lib/domain-errors'
import {
  nameSchema,
  notesSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'

const roasterCreateSchema = z.object({
  name: nameSchema,
  location: shortTextSchema.optional(),
  country: shortTextSchema.optional(),
  website: optionalUrlSchema,
  instagramHandle: z.string().trim().max(100).optional(),
  notes: notesSchema.optional(),
})

const roasterUpdateSchema = roasterCreateSchema.partial().extend({
  id: positiveIdSchema,
  location: shortTextSchema.nullable().optional(),
  country: shortTextSchema.nullable().optional(),
  website: z
    .union([z.url().max(2_048), z.literal('')])
    .nullable()
    .optional(),
  instagramHandle: z.string().trim().max(100).nullable().optional(),
  notes: notesSchema.nullable().optional(),
})

const ROASTERS_PAGE_SIZE = 25
const roasterListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['name', 'location', 'beans']).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

export const getRoasters = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.query.roasters.findMany({
      orderBy: [desc(roasters.createdAt)],
      with: {
        beans: true,
      },
    })
  },
)

export const getRoasterPage = createServerFn({ method: 'GET' })
  .validator(roasterListSchema)
  .handler(async ({ data }) => {
    const where = data.query
      ? ilike(roasters.name, `%${data.query}%`)
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(roasters)
      .where(where)
    const totalItems = countRows[0]?.value ?? 0
    const totalPages = Math.max(1, Math.ceil(totalItems / ROASTERS_PAGE_SIZE))
    const page = Math.min(data.page, totalPages)
    const beanCount = sql<number>`count(${beans.id})::int`
    const sortExpression =
      data.sort === 'beans'
        ? beanCount
        : data.sort === 'location'
          ? sql`coalesce(${roasters.location}, '') || coalesce(${roasters.country}, '')`
          : roasters.name
    const order =
      data.direction === 'asc' ? asc(sortExpression) : desc(sortExpression)
    const items = await db
      .select({
        id: roasters.id,
        name: roasters.name,
        location: roasters.location,
        country: roasters.country,
        notes: roasters.notes,
        beanCount,
      })
      .from(roasters)
      .leftJoin(beans, eq(beans.roasterId, roasters.id))
      .where(where)
      .groupBy(roasters.id)
      .orderBy(order, asc(roasters.id))
      .limit(ROASTERS_PAGE_SIZE)
      .offset((page - 1) * ROASTERS_PAGE_SIZE)

    return { items, page, pageSize: ROASTERS_PAGE_SIZE, totalItems, totalPages }
  })

export const getRoaster = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    return db.query.roasters.findFirst({
      where: eq(roasters.id, id),
      with: {
        beans: true,
      },
    })
  })

export const createRoaster = createServerFn({ method: 'POST' })
  .validator(roasterCreateSchema)
  .handler(async ({ data }) => {
    const [roaster] = await db.insert(roasters).values(data).returning()
    return expectReturnedRow(roaster, 'Roaster')
  })

export const updateRoaster = createServerFn({ method: 'POST' })
  .validator(roasterUpdateSchema)
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [roaster] = await db
      .update(roasters)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(roasters.id, id))
      .returning()
    return expectReturnedRow(roaster, 'Roaster')
  })

export const deleteRoaster = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [roaster] = await db
      .delete(roasters)
      .where(eq(roasters.id, id))
      .returning({ id: roasters.id })
    expectReturnedRow(roaster, 'Roaster')
  })
