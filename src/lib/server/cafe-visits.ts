import { createServerFn } from '@tanstack/react-start'
import { count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, cafeVisits, cafeVisitTasteTags, coffeeShops } from '@/db/schema'
import { toDisplayableDatabaseError } from '@/lib/server/database-error.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import {
  boundedDecimalStringSchema,
  currencySchema,
  notesSchema,
  optionalNullablePositiveIdSchema,
  optionalNullableRatingSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'
import {
  assertValidUpdate,
  getCafeVisitUpdateErrors,
} from '@/lib/update-validation'

const cafeVisitSchema = z.object({
  coffeeShopId: optionalNullablePositiveIdSchema,
  beanId: optionalNullablePositiveIdSchema,
  drinkName: shortTextSchema.optional(),
  drinkType: shortTextSchema.optional(),
  price: boundedDecimalStringSchema(9_999.99, 2).optional(),
  currency: currencySchema.optional(),
  rating: optionalNullableRatingSchema,
  notes: notesSchema.optional(),
  visitedAt: z.date().optional(),
  tasteTagIds: z.array(positiveIdSchema).max(100).optional(),
})

const cafeVisitUpdateSchema = cafeVisitSchema.partial().extend({
  id: positiveIdSchema,
})

const VISITS_PAGE_SIZE = 18
const cafeVisitListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})

const cafeVisitRelations = {
  coffeeShop: true,
  bean: true,
  tasteTags: {
    with: {
      tasteTag: true,
    },
  },
  images: true,
} as const

export const getCafeVisitPage = createServerFn({ method: 'GET' })
  .validator(cafeVisitListSchema)
  .handler(async ({ data }) => {
    const pattern = `%${data.query.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
    const where = data.query
      ? sql`lower(coalesce(${cafeVisits.drinkName}, '')) like lower(${pattern}) escape '\\'
          or exists (select 1 from ${coffeeShops} where ${coffeeShops.id} = ${cafeVisits.coffeeShopId} and ${coffeeShops.name} ilike ${pattern} escape '\\')
          or exists (select 1 from ${beans} where ${beans.id} = ${cafeVisits.beanId} and ${beans.name} ilike ${pattern} escape '\\')`
      : undefined
    const [{ value: totalItems }] = await db
      .select({ value: count() })
      .from(cafeVisits)
      .where(where)
    const totalPages = Math.max(1, Math.ceil(totalItems / VISITS_PAGE_SIZE))
    const page = Math.min(data.page, totalPages)
    const items = await db.query.cafeVisits.findMany({
      where,
      orderBy: [desc(cafeVisits.visitedAt), desc(cafeVisits.id)],
      limit: VISITS_PAGE_SIZE,
      offset: (page - 1) * VISITS_PAGE_SIZE,
      with: {
        coffeeShop: true,
        bean: true,
        tasteTags: { with: { tasteTag: true } },
      },
    })
    return { items, page, pageSize: VISITS_PAGE_SIZE, totalItems, totalPages }
  })

export const getCafeVisit = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    try {
      return await db.query.cafeVisits.findFirst({
        where: eq(cafeVisits.id, id),
        with: cafeVisitRelations,
      })
    } catch (error) {
      throw await toDisplayableDatabaseError(error)
    }
  })

export const createCafeVisit = createServerFn({ method: 'POST' })
  .validator(cafeVisitSchema)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { tasteTagIds, ...visitData } = data
      const [visit] = await tx.insert(cafeVisits).values(visitData).returning()

      if (tasteTagIds && tasteTagIds.length > 0) {
        await tx.insert(cafeVisitTasteTags).values(
          [...new Set(tasteTagIds)].map((tasteTagId) => ({
            cafeVisitId: visit.id,
            tasteTagId,
          })),
        )
      }

      return visit
    }),
  )

export const updateCafeVisit = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = cafeVisitUpdateSchema.parse(input)
    assertValidUpdate(getCafeVisitUpdateErrors(data))
    return data
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { id, tasteTagIds, ...values } = data
      const [visit] = await tx
        .update(cafeVisits)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(cafeVisits.id, id))
        .returning()

      if (tasteTagIds !== undefined) {
        await tx
          .delete(cafeVisitTasteTags)
          .where(eq(cafeVisitTasteTags.cafeVisitId, id))
        if (tasteTagIds.length > 0) {
          await tx.insert(cafeVisitTasteTags).values(
            [...new Set(tasteTagIds)].map((tasteTagId) => ({
              cafeVisitId: id,
              tasteTagId,
            })),
          )
        }
      }

      return visit
    }),
  )

export const deleteCafeVisit = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('visits', id))
