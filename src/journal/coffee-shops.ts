import { and, count, desc, eq, type SQL, sql } from 'drizzle-orm'
import { cafeVisits, coffeeShopImages, coffeeShops } from '@/db/schema'
import { deleteEntityWithMedia } from '@/journal/domain/media-lifecycle'
import { caseInsensitiveLike } from '@/journal/domain/portable-query'
import { journalRead, journalWrite } from '@/journal/function'
import {
  coffeeShopCreateSchema,
  coffeeShopListSchema,
  coffeeShopUpdateSchema,
  normalizeCoffeeShopInput,
} from '@/journal/input/coffee-shops'
import { db, journalInsertValues, owned } from '@/journal/platform/database'
import {
  deleteWebsiteFaviconBestEffort,
  refreshWebsiteFaviconBestEffort,
} from '@/journal/platform/effects'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { positiveIdSchema } from '@/lib/server-validation'

const PLACES_PAGE_SIZE = 18

export const getCoffeeShops = journalRead(
  'coffee-shops/getCoffeeShops',
).handler(async () =>
  db.query.coffeeShops.findMany({
    where: owned(coffeeShops),
    orderBy: [desc(coffeeShops.createdAt)],
    with: {
      images: true,
    },
  }),
)

const coffeeShopOverviewSelection = () => ({
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
  visitCount: sql<number>`count(${cafeVisits.id})`,
  latestVisitAt: sql<Date | null>`max(${cafeVisits.visitedAt})`.mapWith(
    cafeVisits.visitedAt,
  ),
  // Correlated so the café photo can lead the list entry without dragging a
  // second row per image through the visit aggregate.
  imagePath: sql<string | null>`(
    select ${coffeeShopImages.storagePath}
    from ${coffeeShopImages}
    where ${coffeeShopImages.coffeeShopId} = ${coffeeShops.id}
    order by ${coffeeShopImages.id}
    limit 1
  )`,
})

function coffeeShopOverviewQuery(condition?: SQL) {
  return db
    .select(coffeeShopOverviewSelection())
    .from(coffeeShops)
    .where(owned(coffeeShops, condition))
    .leftJoin(cafeVisits, eq(cafeVisits.coffeeShopId, coffeeShops.id))
    .groupBy(coffeeShops.id)
}

export const getCoffeeShopMapOverview = journalRead(
  'coffee-shops/getCoffeeShopMapOverview',
).handler(async () =>
  coffeeShopOverviewQuery().orderBy(
    desc(coffeeShops.isFavorite),
    desc(coffeeShops.wantsToVisit),
    desc(sql`max(${cafeVisits.visitedAt})`),
    coffeeShops.name,
  ),
)

export const getCoffeeShopPage = journalRead('coffee-shops/getCoffeeShopPage')
  .validator(coffeeShopListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const queryWhere = data.query
      ? sql`${caseInsensitiveLike(coffeeShops.name, pattern)}
          or ${caseInsensitiveLike(coffeeShops.city, pattern)}
          or ${caseInsensitiveLike(coffeeShops.country, pattern)}`
      : undefined
    const listWhere =
      data.list === 'favorites'
        ? eq(coffeeShops.isFavorite, true)
        : data.list === 'want-to-visit'
          ? eq(coffeeShops.wantsToVisit, true)
          : undefined
    const where = and(queryWhere, listWhere)
    const [countRows, listCountRows] = await Promise.all([
      db
        .select({ value: count() })
        .from(coffeeShops)
        .where(owned(coffeeShops, where)),
      db
        .select({
          all: count(),
          favorites: sql<number>`count(*) filter (where ${coffeeShops.isFavorite} = true)`,
          wantToVisit: sql<number>`count(*) filter (where ${coffeeShops.wantsToVisit} = true)`,
        })
        .from(coffeeShops)
        .where(owned(coffeeShops)),
    ])
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(
      totalItems,
      data.page,
      PLACES_PAGE_SIZE,
    )
    const { page } = pagination
    const items = await coffeeShopOverviewQuery(where)
      .orderBy(
        desc(coffeeShops.isFavorite),
        desc(coffeeShops.wantsToVisit),
        desc(sql`max(${cafeVisits.visitedAt})`),
        coffeeShops.name,
      )
      .limit(PLACES_PAGE_SIZE)
      .offset((page - 1) * PLACES_PAGE_SIZE)
    const listCounts = listCountRows[0] ?? {
      all: 0,
      favorites: 0,
      wantToVisit: 0,
    }
    return { items, ...pagination, listCounts }
  })

export const getCoffeeShop = journalRead('coffee-shops/getCoffeeShop')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.query.coffeeShops.findFirst({
      where: owned(coffeeShops, eq(coffeeShops.id, id)),
      with: {
        images: true,
        cafeVisits: { with: { drinkType: true } },
      },
    }),
  )

export const createCoffeeShop = journalWrite('coffee-shops/createCoffeeShop')
  .validator((data: unknown) =>
    normalizeCoffeeShopInput(coffeeShopCreateSchema.parse(data)),
  )
  .handler(async ({ data }) => {
    const [coffeeShop] = await db
      .insert(coffeeShops)
      .values(journalInsertValues(data))
      .returning()
    const created = expectReturnedRow(coffeeShop, 'Café')
    await refreshWebsiteFaviconBestEffort({
      entityType: 'coffee-shops',
      entityId: created.id,
      website: created.website,
    })
    return created
  })

export const updateCoffeeShop = journalWrite('coffee-shops/updateCoffeeShop')
  .validator((data: unknown) =>
    normalizeCoffeeShopInput(coffeeShopUpdateSchema.parse(data)),
  )
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [coffeeShop] = await db
      .update(coffeeShops)
      .set({ ...values, updatedAt: new Date() })
      .where(owned(coffeeShops, eq(coffeeShops.id, id)))
      .returning()
    const updated = expectReturnedRow(coffeeShop, 'Café')
    await refreshWebsiteFaviconBestEffort({
      entityType: 'coffee-shops',
      entityId: updated.id,
      website: updated.website,
    })
    return updated
  })

export const deleteCoffeeShop = journalWrite('coffee-shops/deleteCoffeeShop')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await deleteEntityWithMedia('coffee-shops', id)
    await deleteWebsiteFaviconBestEffort('coffee-shops', id)
  })
