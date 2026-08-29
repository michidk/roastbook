import { createServerFn } from '@tanstack/react-start'
import { count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  beans,
  cafeVisits,
  cafeVisitTasteTags,
  coffeeShops,
  drinkTypes,
} from '@/db/schema'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { DECIMAL_CONSTRAINTS } from '@/lib/measurement-constraints'
import { toDisplayableDatabaseError } from '@/lib/server/database-error.server'
import {
  assertDrinkSelection,
  replaceCafeVisitDrinkOptions,
} from '@/lib/server/drink-options.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import {
  boundedDecimalStringSchema,
  currencySchema,
  notesSchema,
  notFutureDateSchema,
  optionalNullablePositiveIdSchema,
  optionalNullableRatingSchema,
  positiveIdSchema,
} from '@/lib/server-validation'
import {
  assertValidUpdate,
  getCafeVisitUpdateErrors,
} from '@/lib/update-validation'

const cafeVisitSchema = z.object({
  coffeeShopId: optionalNullablePositiveIdSchema,
  beanId: optionalNullablePositiveIdSchema,
  drinkTypeId: optionalNullablePositiveIdSchema,
  drinkOptionValueIds: z.array(positiveIdSchema).max(20).optional(),
  price: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.cafeVisitPrice.maximum,
    DECIMAL_CONSTRAINTS.cafeVisitPrice.fractionDigits,
  ).optional(),
  currency: currencySchema.optional(),
  rating: optionalNullableRatingSchema,
  notes: notesSchema.optional(),
  visitedAt: notFutureDateSchema.optional(),
  tasteTagIds: z.array(positiveIdSchema).max(100).optional(),
})

const cafeVisitUpdateSchema = cafeVisitSchema.partial().extend({
  id: positiveIdSchema,
  drinkTypeId: optionalNullablePositiveIdSchema,
  price: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.cafeVisitPrice.maximum,
    DECIMAL_CONSTRAINTS.cafeVisitPrice.fractionDigits,
  )
    .nullable()
    .optional(),
  currency: currencySchema.nullable().optional(),
  notes: notesSchema.nullable().optional(),
})

const VISITS_PAGE_SIZE = 18
const cafeVisitListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})

const cafeVisitRelations = {
  coffeeShop: true,
  bean: true,
  drinkType: true,
  drinkOptions: { with: { optionValue: { with: { group: true } } } },
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
    const pattern = escapedContainsPattern(data.query)
    const where = data.query
      ? sql`exists (select 1 from ${drinkTypes} where ${drinkTypes.id} = ${cafeVisits.drinkTypeId} and ${drinkTypes.name} ilike ${pattern} escape '\\')
          or exists (select 1 from ${coffeeShops} where ${coffeeShops.id} = ${cafeVisits.coffeeShopId} and ${coffeeShops.name} ilike ${pattern} escape '\\')
          or exists (select 1 from ${beans} where ${beans.id} = ${cafeVisits.beanId} and ${beans.name} ilike ${pattern} escape '\\')`
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(cafeVisits)
      .where(where)
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(
      totalItems,
      data.page,
      VISITS_PAGE_SIZE,
    )
    const { page } = pagination
    const items = await db.query.cafeVisits.findMany({
      where,
      orderBy: [desc(cafeVisits.visitedAt), desc(cafeVisits.id)],
      limit: VISITS_PAGE_SIZE,
      offset: (page - 1) * VISITS_PAGE_SIZE,
      with: {
        coffeeShop: true,
        bean: true,
        drinkType: true,
        tasteTags: { with: { tasteTag: true } },
      },
    })
    return { items, ...pagination }
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
      const { tasteTagIds, drinkOptionValueIds = [], ...visitData } = data
      await assertDrinkSelection(tx, visitData.drinkTypeId, drinkOptionValueIds)
      const [visit] = await tx.insert(cafeVisits).values(visitData).returning()
      const persistedVisit = expectReturnedRow(visit, 'Visit')

      await replaceCafeVisitDrinkOptions(
        tx,
        persistedVisit.id,
        drinkOptionValueIds,
      )

      if (tasteTagIds && tasteTagIds.length > 0) {
        await tx.insert(cafeVisitTasteTags).values(
          [...new Set(tasteTagIds)].map((tasteTagId) => ({
            cafeVisitId: persistedVisit.id,
            tasteTagId,
          })),
        )
      }

      return persistedVisit
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
      const { id, tasteTagIds, drinkOptionValueIds, ...values } = data
      await assertDrinkSelection(tx, values.drinkTypeId, drinkOptionValueIds)
      const [visit] = await tx
        .update(cafeVisits)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(cafeVisits.id, id))
        .returning()
      const persistedVisit = expectReturnedRow(visit, 'Visit')

      if (drinkOptionValueIds !== undefined) {
        await replaceCafeVisitDrinkOptions(tx, id, drinkOptionValueIds)
      }

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

      return persistedVisit
    }),
  )

export const deleteCafeVisit = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('visits', id))
