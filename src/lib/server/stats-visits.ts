import { and, desc, eq, isNotNull, type SQL, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  cafeVisits,
  cafeVisitTasteTags,
  coffeeShops,
  tasteTags,
} from '@/db/schema'
import {
  localDate,
  localDateKey,
  localDateRangeCondition,
  statsBucketExpression,
} from '@/lib/server/stats-sql.server'
import { calculateStreaks, fillBucketSeries } from '@/lib/stats-analysis'
import { dateKeyInTimeZone, type StatsRange } from '@/lib/stats-filters'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

const averageVisitRatingSql = sql<
  string | number | null
>`round(avg(${cafeVisits.rating})::numeric, 2)`

function visitCondition(
  timeZone: string,
  start: string | null,
  end: string,
): SQL<unknown> {
  return localDateRangeCondition(cafeVisits.visitedAt, timeZone, start, end)
}

export async function getVisitsAndPlacesStats({
  range,
  timeZone,
  now,
}: {
  readonly range: StatsRange
  readonly timeZone: string
  readonly now: Date
}) {
  const currentWhere = visitCondition(timeZone, range.start, range.end)
  const previousWhere =
    range.previousStart && range.previousEnd
      ? visitCondition(timeZone, range.previousStart, range.previousEnd)
      : null
  const trendBucket = statsBucketExpression(
    cafeVisits.visitedAt,
    timeZone,
    range.bucket,
  )
  const visitDateKey = localDateKey(cafeVisits.visitedAt, timeZone)

  const [
    visitTotals,
    previousTotals,
    placeTotals,
    topPlacesByVisits,
    trend,
    drinkTypes,
    cities,
    tagUsage,
    spend,
    visitDates,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        firstDate: sql<
          string | null
        >`min(${localDate(cafeVisits.visitedAt, timeZone)})::text`,
        averageRating: averageVisitRatingSql,
        totalRated: sql<number>`count(${cafeVisits.rating})::int`,
        uniquePlaces: sql<number>`count(distinct ${cafeVisits.coffeeShopId})::int`,
      })
      .from(cafeVisits)
      .where(currentWhere),

    previousWhere
      ? db
          .select({
            total: sql<number>`count(*)::int`,
            averageRating: averageVisitRatingSql,
          })
          .from(cafeVisits)
          .where(previousWhere)
      : Promise.resolve([]),

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
      .where(currentWhere)
      .groupBy(coffeeShops.id, coffeeShops.name, coffeeShops.city)
      .orderBy(desc(sql`count(*)`), coffeeShops.name)
      .limit(5),

    db
      .select({
        date: trendBucket,
        count: sql<number>`count(*)::int`,
        averageRating: averageVisitRatingSql,
      })
      .from(cafeVisits)
      .where(currentWhere)
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        name: cafeVisits.drinkType,
        count: sql<number>`count(*)::int`,
        avgRating: averageVisitRatingSql,
      })
      .from(cafeVisits)
      .where(and(currentWhere, isNotNull(cafeVisits.drinkType)))
      .groupBy(cafeVisits.drinkType)
      .orderBy(desc(sql`count(*)`))
      .limit(6),

    db
      .select({
        name: coffeeShops.city,
        count: sql<number>`count(*)::int`,
      })
      .from(cafeVisits)
      .innerJoin(coffeeShops, eq(cafeVisits.coffeeShopId, coffeeShops.id))
      .where(and(currentWhere, isNotNull(coffeeShops.city)))
      .groupBy(coffeeShops.city)
      .orderBy(desc(sql`count(*)`))
      .limit(6),

    db
      .select({
        id: tasteTags.id,
        name: tasteTags.name,
        category: tasteTags.category,
        count: sql<number>`count(distinct ${cafeVisits.id})::int`,
        avgRating: averageVisitRatingSql,
      })
      .from(cafeVisitTasteTags)
      .innerJoin(cafeVisits, eq(cafeVisitTasteTags.cafeVisitId, cafeVisits.id))
      .innerJoin(tasteTags, eq(cafeVisitTasteTags.tasteTagId, tasteTags.id))
      .where(currentWhere)
      .groupBy(tasteTags.id, tasteTags.name, tasteTags.category)
      .orderBy(desc(sql`count(distinct ${cafeVisits.id})`))
      .limit(8),

    db
      .select({
        currency: cafeVisits.currency,
        total: sql<
          string | number
        >`round(sum(${cafeVisits.price}::numeric), 2)`,
        average: sql<
          string | number
        >`round(avg(${cafeVisits.price}::numeric), 2)`,
        count: sql<number>`count(${cafeVisits.price})::int`,
      })
      .from(cafeVisits)
      .where(and(currentWhere, isNotNull(cafeVisits.price)))
      .groupBy(cafeVisits.currency)
      .orderBy(cafeVisits.currency),

    db
      .select({ date: visitDateKey, count: sql<number>`count(*)::int` })
      .from(cafeVisits)
      .where(currentWhere)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ])

  return {
    visits: {
      total: visitTotals[0]?.total ?? 0,
      previousTotal: previousTotals[0]?.total ?? null,
      averageRating: toNullableNumber(visitTotals[0]?.averageRating),
      previousAverageRating: toNullableNumber(previousTotals[0]?.averageRating),
      totalRated: visitTotals[0]?.totalRated ?? 0,
      trend: fillBucketSeries(
        trend.map((row) => ({
          ...row,
          averageRating: toNullableNumber(row.averageRating),
        })),
        range.start ?? visitTotals[0]?.firstDate ?? null,
        range.end,
        range.bucket,
        (date) => ({ date, count: 0, averageRating: null }),
      ),
      drinkTypes: normalizeRatingAverages(
        drinkTypes.filter((row) => row.name !== null),
      ),
      cities: cities.filter((row) => row.name !== null),
      tasteTags: normalizeRatingAverages(tagUsage),
      spend: spend.map((row) => ({
        currency: row.currency ?? 'EUR',
        total: Number(row.total),
        average: Number(row.average),
        count: row.count,
      })),
      streaks: calculateStreaks(visitDates, dateKeyInTimeZone(now, timeZone)),
    },
    places: {
      total: placeTotals[0]?.total ?? 0,
      visited: visitTotals[0]?.uniquePlaces ?? 0,
      favorites: placeTotals[0]?.favorites ?? 0,
      topByVisits: normalizeRatingAverages(topPlacesByVisits),
    },
  }
}
