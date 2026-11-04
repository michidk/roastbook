import { and, asc, desc, eq, gt, isNotNull, type SQL, sql } from 'drizzle-orm'
import {
  cafeVisits,
  cafeVisitTasteTags,
  coffeeShops,
  drinkTypes as drinkTypesTable,
  tasteTags,
} from '@/db/schema'
import {
  STATS_SCAN_PAGE_SIZE,
  scanStatsRows,
} from '@/journal/domain/stats-scan'
import { localDateRangeCondition } from '@/journal/domain/stats-sql'
import { db, owned } from '@/journal/platform/database'
import { calculateStreaks, fillBucketSeries } from '@/lib/stats-analysis'
import { dateKeyInTimeZone, type StatsRange } from '@/lib/stats-filters'
import { createLocalActivity } from '@/lib/stats-local'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

const averageVisitRatingSql = sql<
  string | number | null
>`round(cast(avg(${cafeVisits.rating}) as numeric), 2)`

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
  const localScanPromise = (async () => {
    const activity = createLocalActivity(timeZone, range.bucket)
    await scanStatsRows(
      (afterId) =>
        db
          .select({
            id: cafeVisits.id,
            visitedAt: cafeVisits.visitedAt,
            rating: cafeVisits.rating,
          })
          .from(cafeVisits)
          .where(
            owned(
              cafeVisits,
              and(
                currentWhere,
                afterId === undefined ? undefined : gt(cafeVisits.id, afterId),
              ),
            ),
          )
          .orderBy(asc(cafeVisits.id))
          .limit(STATS_SCAN_PAGE_SIZE),
      (row) => activity.add(row.visitedAt, row.rating),
    )
    return activity.result()
  })()

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
        total: sql<number>`cast(count(*) as integer)`,
        averageRating: averageVisitRatingSql,
        totalRated: sql<number>`cast(count(${cafeVisits.rating}) as integer)`,
        uniquePlaces: sql<number>`cast(count(distinct ${cafeVisits.coffeeShopId}) as integer)`,
      })
      .from(cafeVisits)
      .where(owned(cafeVisits, currentWhere)),

    previousWhere
      ? db
          .select({
            total: sql<number>`cast(count(*) as integer)`,
            averageRating: averageVisitRatingSql,
          })
          .from(cafeVisits)
          .where(owned(cafeVisits, previousWhere))
      : Promise.resolve([]),

    db
      .select({
        total: sql<number>`cast(count(*) as integer)`,
        favorites: sql<number>`cast(count(*) filter (where ${coffeeShops.isFavorite} = true) as integer)`,
      })
      .from(coffeeShops)
      .where(owned(coffeeShops)),

    db
      .select({
        coffeeShopId: coffeeShops.id,
        coffeeShopName: coffeeShops.name,
        city: coffeeShops.city,
        visitCount: sql<number>`cast(count(*) as integer)`,
        avgRating: averageVisitRatingSql,
      })
      .from(cafeVisits)
      .innerJoin(coffeeShops, eq(cafeVisits.coffeeShopId, coffeeShops.id))
      .where(owned(cafeVisits, currentWhere))
      .groupBy(coffeeShops.id, coffeeShops.name, coffeeShops.city)
      .orderBy(desc(sql`count(*)`), coffeeShops.name)
      .limit(5),

    localScanPromise.then((row) =>
      row.trend.map(({ date, count, averageRating }) => ({
        date,
        count,
        averageRating,
      })),
    ),

    db
      .select({
        name: drinkTypesTable.name,
        count: sql<number>`cast(count(*) as integer)`,
        avgRating: averageVisitRatingSql,
      })
      .from(cafeVisits)
      .innerJoin(
        drinkTypesTable,
        eq(drinkTypesTable.id, cafeVisits.drinkTypeId),
      )
      .where(
        owned(cafeVisits, and(currentWhere, isNotNull(cafeVisits.drinkTypeId))),
      )
      .groupBy(drinkTypesTable.name)
      .orderBy(desc(sql`count(*)`))
      .limit(6),

    db
      .select({
        name: coffeeShops.city,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(cafeVisits)
      .innerJoin(coffeeShops, eq(cafeVisits.coffeeShopId, coffeeShops.id))
      .where(owned(cafeVisits, and(currentWhere, isNotNull(coffeeShops.city))))
      .groupBy(coffeeShops.city)
      .orderBy(desc(sql`count(*)`))
      .limit(6),

    db
      .select({
        id: tasteTags.id,
        name: tasteTags.name,
        category: tasteTags.category,
        count: sql<number>`cast(count(distinct ${cafeVisits.id}) as integer)`,
        avgRating: averageVisitRatingSql,
      })
      .from(cafeVisitTasteTags)
      .innerJoin(cafeVisits, eq(cafeVisitTasteTags.cafeVisitId, cafeVisits.id))
      .innerJoin(tasteTags, eq(cafeVisitTasteTags.tasteTagId, tasteTags.id))
      .where(owned(cafeVisitTasteTags, currentWhere))
      .groupBy(tasteTags.id, tasteTags.name, tasteTags.category)
      .orderBy(desc(sql`count(distinct ${cafeVisits.id})`))
      .limit(8),

    db
      .select({
        currency: cafeVisits.currency,
        total: sql<
          string | number
        >`round(sum(cast(${cafeVisits.price} as numeric)), 2)`,
        average: sql<
          string | number
        >`round(avg(cast(${cafeVisits.price} as numeric)), 2)`,
        count: sql<number>`cast(count(${cafeVisits.price}) as integer)`,
      })
      .from(cafeVisits)
      .where(owned(cafeVisits, and(currentWhere, isNotNull(cafeVisits.price))))
      .groupBy(cafeVisits.currency)
      .orderBy(cafeVisits.currency),

    localScanPromise.then((row) => row.activityDates),
  ])

  const localized = await localScanPromise
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
        range.start ?? localized.firstDate ?? null,
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
