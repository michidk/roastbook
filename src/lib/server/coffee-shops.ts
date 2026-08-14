import { createServerFn } from '@tanstack/react-start'
import { count, desc, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { cafeVisits, coffeeShops } from '@/db/schema'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import {
  nameSchema,
  notesSchema,
  optionalNullableRatingSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'

type CoordinateInput = string | number | undefined

const coordinateInputSchema = z
  .union([z.number().finite(), z.string().trim().max(32)])
  .optional()

const coffeeShopCreateSchema = z.object({
  name: nameSchema,
  address: shortTextSchema.optional(),
  city: shortTextSchema.optional(),
  country: shortTextSchema.optional(),
  latitude: coordinateInputSchema,
  longitude: coordinateInputSchema,
  website: optionalUrlSchema,
  instagramHandle: z.string().trim().max(100).optional(),
  notes: notesSchema.optional(),
})

const coffeeShopUpdateSchema = coffeeShopCreateSchema.partial().extend({
  id: positiveIdSchema,
  rating: optionalNullableRatingSchema,
  isFavorite: z.boolean().optional(),
})

const PLACES_PAGE_SIZE = 18
const coffeeShopListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})

function normalizeCoordinate(
  value: CoordinateInput,
  field: 'latitude' | 'longitude',
) {
  if (value === undefined || value === '') {
    return undefined
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid ${field}`)
  }

  const [min, max] = field === 'latitude' ? [-90, 90] : [-180, 180]

  if (numericValue < min || numericValue > max) {
    throw new Error(`${field} must be between ${min} and ${max}`)
  }

  return String(numericValue)
}

function normalizeCoffeeShopInput<
  T extends { latitude?: CoordinateInput; longitude?: CoordinateInput },
>(data: T) {
  return {
    ...data,
    latitude: normalizeCoordinate(data.latitude, 'latitude'),
    longitude: normalizeCoordinate(data.longitude, 'longitude'),
  }
}

export const getCoffeeShops = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.query.coffeeShops.findMany({
      orderBy: [desc(coffeeShops.createdAt)],
      with: {
        images: true,
      },
    })
  },
)

const coffeeShopOverviewSelection = {
  id: coffeeShops.id,
  name: coffeeShops.name,
  address: coffeeShops.address,
  city: coffeeShops.city,
  country: coffeeShops.country,
  latitude: coffeeShops.latitude,
  longitude: coffeeShops.longitude,
  website: coffeeShops.website,
  rating: coffeeShops.rating,
  isFavorite: coffeeShops.isFavorite,
  visitCount: sql<number>`count(${cafeVisits.id})::int`,
  latestVisitAt: sql<Date | null>`max(${cafeVisits.visitedAt})`,
}

function coffeeShopOverviewQuery() {
  return db
    .select(coffeeShopOverviewSelection)
    .from(coffeeShops)
    .leftJoin(cafeVisits, eq(cafeVisits.coffeeShopId, coffeeShops.id))
    .groupBy(coffeeShops.id)
}

export const getCoffeeShopMapOverview = createServerFn({
  method: 'GET',
}).handler(async () =>
  coffeeShopOverviewQuery().orderBy(
    desc(coffeeShops.isFavorite),
    desc(sql`max(${cafeVisits.visitedAt})`),
    coffeeShops.name,
  ),
)

export const getCoffeeShopPage = createServerFn({ method: 'GET' })
  .validator(coffeeShopListSchema)
  .handler(async ({ data }) => {
    const where = data.query
      ? sql`${ilike(coffeeShops.name, `%${data.query}%`)}
          or ${ilike(coffeeShops.city, `%${data.query}%`)}
          or ${ilike(coffeeShops.country, `%${data.query}%`)}`
      : undefined
    const [{ value: totalItems }] = await db
      .select({ value: count() })
      .from(coffeeShops)
      .where(where)
    const totalPages = Math.max(1, Math.ceil(totalItems / PLACES_PAGE_SIZE))
    const page = Math.min(data.page, totalPages)
    const items = await coffeeShopOverviewQuery()
      .where(where)
      .orderBy(
        desc(coffeeShops.isFavorite),
        desc(sql`max(${cafeVisits.visitedAt})`),
        coffeeShops.name,
      )
      .limit(PLACES_PAGE_SIZE)
      .offset((page - 1) * PLACES_PAGE_SIZE)
    return { items, page, pageSize: PLACES_PAGE_SIZE, totalItems, totalPages }
  })

export const getCoffeeShop = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    return db.query.coffeeShops.findFirst({
      where: eq(coffeeShops.id, id),
      with: {
        images: true,
        cafeVisits: true,
      },
    })
  })

export const createCoffeeShop = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    normalizeCoffeeShopInput(coffeeShopCreateSchema.parse(data)),
  )
  .handler(async ({ data }) => {
    const [coffeeShop] = await db.insert(coffeeShops).values(data).returning()
    return coffeeShop
  })

export const updateCoffeeShop = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    normalizeCoffeeShopInput(coffeeShopUpdateSchema.parse(data)),
  )
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [coffeeShop] = await db
      .update(coffeeShops)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(coffeeShops.id, id))
      .returning()
    return coffeeShop
  })

export const deleteCoffeeShop = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('coffee-shops', id))
