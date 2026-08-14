import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { cafeVisits, coffeeShopImages, coffeeShops } from '@/db/schema'
import {
  deleteWebsiteFaviconBestEffort,
  refreshWebsiteFaviconBestEffort,
} from '@/lib/server/favicon-cache.server'
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
  wantsToVisit: z.boolean().optional(),
})

const PLACES_PAGE_SIZE = 18
const coffeeShopListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  list: z.enum(['all', 'favorites', 'want-to-visit']).default('all'),
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
  async () =>
    db.query.coffeeShops.findMany({
      orderBy: [desc(coffeeShops.createdAt)],
      with: {
        images: true,
      },
    }),
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
  updatedAt: coffeeShops.updatedAt,
  rating: coffeeShops.rating,
  isFavorite: coffeeShops.isFavorite,
  wantsToVisit: coffeeShops.wantsToVisit,
  visitCount: sql<number>`count(${cafeVisits.id})::int`,
  latestVisitAt: sql<Date | null>`max(${cafeVisits.visitedAt})`,
  // Correlated so the café photo can lead the list entry without dragging a
  // second row per image through the visit aggregate.
  imagePath: sql<string | null>`(
    select ${coffeeShopImages.storagePath}
    from ${coffeeShopImages}
    where ${coffeeShopImages.coffeeShopId} = ${coffeeShops.id}
    order by ${coffeeShopImages.id}
    limit 1
  )`,
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
    desc(coffeeShops.wantsToVisit),
    desc(sql`max(${cafeVisits.visitedAt})`),
    coffeeShops.name,
  ),
)

export const getCoffeeShopPage = createServerFn({ method: 'GET' })
  .validator(coffeeShopListSchema)
  .handler(async ({ data }) => {
    const queryWhere = data.query
      ? sql`${ilike(coffeeShops.name, `%${data.query}%`)}
          or ${ilike(coffeeShops.city, `%${data.query}%`)}
          or ${ilike(coffeeShops.country, `%${data.query}%`)}`
      : undefined
    const listWhere =
      data.list === 'favorites'
        ? eq(coffeeShops.isFavorite, true)
        : data.list === 'want-to-visit'
          ? eq(coffeeShops.wantsToVisit, true)
          : undefined
    const where = and(queryWhere, listWhere)
    const [[{ value: totalItems }], [listCounts]] = await Promise.all([
      db.select({ value: count() }).from(coffeeShops).where(where),
      db
        .select({
          all: count(),
          favorites: sql<number>`count(*) filter (where ${coffeeShops.isFavorite} = true)::int`,
          wantToVisit: sql<number>`count(*) filter (where ${coffeeShops.wantsToVisit} = true)::int`,
        })
        .from(coffeeShops),
    ])
    const totalPages = Math.max(1, Math.ceil(totalItems / PLACES_PAGE_SIZE))
    const page = Math.min(data.page, totalPages)
    const items = await coffeeShopOverviewQuery()
      .where(where)
      .orderBy(
        desc(coffeeShops.isFavorite),
        desc(coffeeShops.wantsToVisit),
        desc(sql`max(${cafeVisits.visitedAt})`),
        coffeeShops.name,
      )
      .limit(PLACES_PAGE_SIZE)
      .offset((page - 1) * PLACES_PAGE_SIZE)
    return {
      items,
      page,
      pageSize: PLACES_PAGE_SIZE,
      totalItems,
      totalPages,
      listCounts,
    }
  })

export const getCoffeeShop = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.query.coffeeShops.findFirst({
      where: eq(coffeeShops.id, id),
      with: {
        images: true,
        cafeVisits: true,
      },
    }),
  )

export const createCoffeeShop = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    normalizeCoffeeShopInput(coffeeShopCreateSchema.parse(data)),
  )
  .handler(async ({ data }) => {
    const [coffeeShop] = await db.insert(coffeeShops).values(data).returning()
    await refreshWebsiteFaviconBestEffort({
      entityType: 'coffee-shops',
      entityId: coffeeShop.id,
      website: coffeeShop.website,
    })
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
    if (coffeeShop) {
      await refreshWebsiteFaviconBestEffort({
        entityType: 'coffee-shops',
        entityId: coffeeShop.id,
        website: coffeeShop.website,
      })
    }
    return coffeeShop
  })

export const deleteCoffeeShop = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await deleteEntityWithMedia('coffee-shops', id)
    await deleteWebsiteFaviconBestEffort('coffee-shops', id)
  })
