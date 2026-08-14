import { count, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { cafeVisits, coffeeShops } from '@/db/schema'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

const averageVisitRatingSql = sql<
  string | number | null
>`round(avg(${cafeVisits.rating})::numeric, 2)`

export async function getVisitsAndPlacesStats(startOfMonth: Date) {
  const [visitTotals, visitsThisMonth, placeTotals, topPlacesByVisits] =
    await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          averageRating: averageVisitRatingSql,
          totalRated: sql<number>`count(${cafeVisits.rating})::int`,
          uniquePlaces: sql<number>`count(distinct ${cafeVisits.coffeeShopId})::int`,
        })
        .from(cafeVisits),

      buildVisitsThisMonthQuery(startOfMonth),

      db
        .select({
          total: sql<number>`count(*)::int`,
          favorites: sql<number>`count(*) filter (where ${coffeeShops.isFavorite} = true)::int`,
        })
        .from(coffeeShops),

      db
        .select({
          coffeeShopId: coffeeShops.id,
          coffeeShopName: coffeeShops.name,
          city: coffeeShops.city,
          visitCount: sql<number>`count(*)::int`,
          avgRating: averageVisitRatingSql,
        })
        .from(cafeVisits)
        .innerJoin(coffeeShops, eq(cafeVisits.coffeeShopId, coffeeShops.id))
        .groupBy(coffeeShops.id, coffeeShops.name, coffeeShops.city)
        .orderBy(desc(sql`count(*)`), coffeeShops.name)
        .limit(5),
    ])

  return {
    visits: {
      total: visitTotals[0]?.total ?? 0,
      thisMonth: visitsThisMonth[0]?.count ?? 0,
      averageRating: toNullableNumber(visitTotals[0]?.averageRating),
      totalRated: visitTotals[0]?.totalRated ?? 0,
    },
    places: {
      total: placeTotals[0]?.total ?? 0,
      visited: visitTotals[0]?.uniquePlaces ?? 0,
      favorites: placeTotals[0]?.favorites ?? 0,
      topByVisits: normalizeRatingAverages(topPlacesByVisits),
    },
  }
}

function buildVisitsThisMonthQuery(startOfMonth: Date) {
  return db
    .select({ count: count() })
    .from(cafeVisits)
    .where(gte(cafeVisits.visitedAt, startOfMonth))
}
