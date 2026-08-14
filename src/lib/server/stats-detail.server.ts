import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  notInArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { db } from '@/db'
import {
  beans,
  brewingMethods,
  gear,
  recipes,
  roasters,
  settings,
  shotAccessoryGear,
  shots,
  shotTasteTags,
  tasteTags,
} from '@/db/schema'
import { toDisplayableDatabaseError } from '@/lib/server/database-error.server'
import {
  localDate,
  localDateKey,
  localDateRangeCondition,
  localTimestamp,
  statsBucketExpression,
} from '@/lib/server/stats-sql.server'
import { getVisitsAndPlacesStats } from '@/lib/server/stats-visits'
import { calculateStreaks, fillBucketSeries } from '@/lib/stats-analysis'
import {
  dateKeyInTimeZone,
  daysBetween,
  resolveStatsRange,
  type StatsFilter,
} from '@/lib/stats-filters'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

const shotCountSql = sql<number>`count(*)::int`
const averageShotRatingSql = sql<
  string | number | null
>`round(avg(${shots.rating})::numeric, 2)`
const ratioSql = sql<string | number | null>`case
  when ${shots.doseGrams} is null or ${shots.doseGrams}::numeric = 0 then null
  when ${shots.ratioBasis} = 'brew_water' then
    ${shots.brewWaterGrams}::numeric / nullif(${shots.doseGrams}::numeric, 0)
  else ${shots.yieldGrams}::numeric / nullif(${shots.doseGrams}::numeric, 0)
end`

function shotCondition({
  timeZone,
  start,
  end,
  method,
  bean,
}: {
  readonly timeZone: string
  readonly start: string | null
  readonly end: string
  readonly method?: number
  readonly bean?: number
}): SQL<unknown> {
  const condition = and(
    localDateRangeCondition(shots.brewedAt, timeZone, start, end),
    method ? eq(shots.brewingMethodId, method) : undefined,
    bean ? eq(shots.beanId, bean) : undefined,
  )
  if (!condition) throw new Error('Could not build brew statistics range')
  return condition
}

function getGearUsage(
  role: 'brewer' | 'grinder' | 'accessory',
  where: SQL<unknown>,
) {
  const joinCondition =
    role === 'grinder'
      ? eq(shots.grinderId, gear.id)
      : role === 'brewer'
        ? eq(shots.machineId, gear.id)
        : or(
            eq(shots.basketId, gear.id),
            sql`exists (
              select 1 from ${shotAccessoryGear}
              where ${shotAccessoryGear.shotId} = ${shots.id}
                and ${shotAccessoryGear.gearId} = ${gear.id}
            )`,
          )
  if (!joinCondition) throw new Error('Could not build gear usage join')
  const roleCondition =
    role === 'grinder'
      ? inArray(gear.type, ['grinder', 'espresso_machine_with_grinder'])
      : role === 'brewer'
        ? inArray(gear.type, [
            'brewer',
            'espresso_machine',
            'espresso_machine_with_grinder',
          ])
        : notInArray(gear.type, [
            'brewer',
            'grinder',
            'espresso_machine',
            'espresso_machine_with_grinder',
          ])

  return db
    .select({
      gearId: gear.id,
      gearName: gear.name,
      gearType: gear.type,
      shotCount: sql<number>`count(distinct ${shots.id})::int`,
    })
    .from(gear)
    .innerJoin(shots, joinCondition)
    .where(and(where, roleCondition))
    .groupBy(gear.id, gear.name, gear.type)
    .orderBy(desc(sql`count(distinct ${shots.id})`), gear.name)
    .limit(6)
}

export async function loadDetailedStats(filter: StatsFilter) {
  try {
    const now = new Date()
    const installationSettings = await db.query.settings.findFirst({
      columns: { timeZone: true },
      where: eq(settings.id, 1),
    })
    const timeZone = installationSettings?.timeZone ?? 'UTC'
    const range = resolveStatsRange(filter, now, timeZone)
    const currentWhere = shotCondition({
      timeZone,
      start: range.start,
      end: range.end,
      method: filter.method,
      bean: filter.bean,
    })
    const previousWhere =
      range.previousStart && range.previousEnd
        ? shotCondition({
            timeZone,
            start: range.previousStart,
            end: range.previousEnd,
            method: filter.method,
            bean: filter.bean,
          })
        : null
    const trendBucket = statsBucketExpression(
      shots.brewedAt,
      timeZone,
      range.bucket,
    )
    const shotDateKey = localDateKey(shots.brewedAt, timeZone)
    const roasterName = sql<
      string | null
    >`coalesce(${roasters.name}, ${beans.roaster})`
    const roastAgeDays = sql<number>`(${localDate(shots.brewedAt, timeZone)} - date(${beans.roastDate}))`
    const roastAgeBucket = sql<string>`case
        when ${roastAgeDays} < 7 then '0–6 days'
        when ${roastAgeDays} < 15 then '7–14 days'
        when ${roastAgeDays} < 31 then '15–30 days'
        else '31+ days'
      end`

    const [
      summaryRows,
      previousSummaryRows,
      topBeansByShots,
      topBeansByRating,
      brewerUsage,
      grinderUsage,
      accessoryUsage,
      qualityTrend,
      methodUsage,
      tasteProfile,
      consistencyRows,
      dialInRows,
      rhythmRows,
      activityDates,
      roasterUsage,
      originUsage,
      processUsage,
      roastLevelUsage,
      roastAgeUsage,
      recipePerformance,
      homeSpend,
      availableMethods,
      availableBeans,
      visitsAndPlaces,
    ] = await Promise.all([
      db
        .select({
          total: shotCountSql,
          firstDate: sql<
            string | null
          >`min(${localDate(shots.brewedAt, timeZone)})::text`,
          totalGrams: sql<
            string | number
          >`coalesce(sum(${shots.doseGrams}::numeric), 0)`,
          uniqueBeans: sql<number>`count(distinct ${shots.beanId})::int`,
          avgRating: averageShotRatingSql,
          totalRated: sql<number>`count(${shots.rating})::int`,
          highRated: sql<number>`count(*) filter (where ${shots.rating} >= 4)::int`,
          rating1: sql<number>`count(*) filter (where ${shots.rating} = 1)::int`,
          rating2: sql<number>`count(*) filter (where ${shots.rating} = 2)::int`,
          rating3: sql<number>`count(*) filter (where ${shots.rating} = 3)::int`,
          rating4: sql<number>`count(*) filter (where ${shots.rating} = 4)::int`,
          rating5: sql<number>`count(*) filter (where ${shots.rating} = 5)::int`,
          avgDose: sql<
            string | number | null
          >`round(avg(${shots.doseGrams}::numeric), 1)`,
          avgYield: sql<
            string | number | null
          >`round(avg(${shots.yieldGrams}::numeric), 1)`,
          avgTime: sql<
            string | number | null
          >`round(avg(${shots.shotTimeSeconds}::numeric), 0)`,
          avgRatio: sql<string | number | null>`round(avg(${ratioSql}), 2)`,
        })
        .from(shots)
        .where(currentWhere),

      previousWhere
        ? db
            .select({
              total: shotCountSql,
              totalGrams: sql<
                string | number
              >`coalesce(sum(${shots.doseGrams}::numeric), 0)`,
              avgRating: averageShotRatingSql,
              totalRated: sql<number>`count(${shots.rating})::int`,
            })
            .from(shots)
            .where(previousWhere)
        : Promise.resolve([]),

      db
        .select({
          beanId: beans.id,
          beanName: beans.name,
          shotCount: shotCountSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(currentWhere)
        .groupBy(beans.id, beans.name)
        .orderBy(desc(sql`count(*)`), beans.name)
        .limit(5),

      db
        .select({
          beanId: beans.id,
          beanName: beans.name,
          shotCount: shotCountSql,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(and(currentWhere, isNotNull(shots.rating)))
        .groupBy(beans.id, beans.name)
        .having(sql`count(*) >= 3`)
        .orderBy(
          desc(sql`avg(${shots.rating})`),
          desc(sql`count(*)`),
          beans.name,
        )
        .limit(5),

      getGearUsage('brewer', currentWhere),
      getGearUsage('grinder', currentWhere),
      getGearUsage('accessory', currentWhere),

      db
        .select({
          date: trendBucket,
          count: shotCountSql,
          averageRating: averageShotRatingSql,
          totalRated: sql<number>`count(${shots.rating})::int`,
          highRated: sql<number>`count(*) filter (where ${shots.rating} >= 4)::int`,
        })
        .from(shots)
        .where(currentWhere)
        .groupBy(sql`1`)
        .orderBy(sql`1`),

      db
        .select({
          methodId: brewingMethods.id,
          methodName: brewingMethods.name,
          shotCount: shotCountSql,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(brewingMethods, eq(shots.brewingMethodId, brewingMethods.id))
        .where(currentWhere)
        .groupBy(brewingMethods.id, brewingMethods.name)
        .orderBy(desc(sql`count(*)`), brewingMethods.name),

      db
        .select({
          id: tasteTags.id,
          name: tasteTags.name,
          category: tasteTags.category,
          count: sql<number>`count(distinct ${shots.id})::int`,
          avgRating: averageShotRatingSql,
          extractionAxis: tasteTags.extractionAxis,
          strengthAxis: tasteTags.strengthAxis,
        })
        .from(shotTasteTags)
        .innerJoin(shots, eq(shotTasteTags.shotId, shots.id))
        .innerJoin(tasteTags, eq(shotTasteTags.tasteTagId, tasteTags.id))
        .where(currentWhere)
        .groupBy(
          tasteTags.id,
          tasteTags.name,
          tasteTags.category,
          tasteTags.extractionAxis,
          tasteTags.strengthAxis,
        )
        .orderBy(desc(sql`count(distinct ${shots.id})`), tasteTags.name)
        .limit(12),

      db
        .select({
          doseCount: sql<number>`count(${shots.doseGrams})::int`,
          doseMedian: sql<
            string | number | null
          >`percentile_cont(0.5) within group (order by ${shots.doseGrams}::numeric)`,
          doseP25: sql<
            string | number | null
          >`percentile_cont(0.25) within group (order by ${shots.doseGrams}::numeric)`,
          doseP75: sql<
            string | number | null
          >`percentile_cont(0.75) within group (order by ${shots.doseGrams}::numeric)`,
          yieldCount: sql<number>`count(${shots.yieldGrams})::int`,
          yieldMedian: sql<
            string | number | null
          >`percentile_cont(0.5) within group (order by ${shots.yieldGrams}::numeric)`,
          yieldP25: sql<
            string | number | null
          >`percentile_cont(0.25) within group (order by ${shots.yieldGrams}::numeric)`,
          yieldP75: sql<
            string | number | null
          >`percentile_cont(0.75) within group (order by ${shots.yieldGrams}::numeric)`,
          timeCount: sql<number>`count(${shots.shotTimeSeconds})::int`,
          timeMedian: sql<
            string | number | null
          >`percentile_cont(0.5) within group (order by ${shots.shotTimeSeconds}::numeric)`,
          timeP25: sql<
            string | number | null
          >`percentile_cont(0.25) within group (order by ${shots.shotTimeSeconds}::numeric)`,
          timeP75: sql<
            string | number | null
          >`percentile_cont(0.75) within group (order by ${shots.shotTimeSeconds}::numeric)`,
          ratioCount: sql<number>`count(${ratioSql})::int`,
          ratioMedian: sql<
            string | number | null
          >`percentile_cont(0.5) within group (order by ${ratioSql})`,
          ratioP25: sql<
            string | number | null
          >`percentile_cont(0.25) within group (order by ${ratioSql})`,
          ratioP75: sql<
            string | number | null
          >`percentile_cont(0.75) within group (order by ${ratioSql})`,
        })
        .from(shots)
        .where(currentWhere),

      db
        .select({
          id: shots.id,
          brewedAt: shots.brewedAt,
          beanId: beans.id,
          beanName: beans.name,
          methodId: brewingMethods.id,
          methodName: brewingMethods.name,
          rating: shots.rating,
          ratio: ratioSql,
          time: shots.shotTimeSeconds,
          temperature: shots.brewTemperatureCelsius,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .innerJoin(brewingMethods, eq(shots.brewingMethodId, brewingMethods.id))
        .where(and(currentWhere, isNotNull(shots.rating)))
        .orderBy(desc(shots.brewedAt))
        .limit(250),

      db
        .select({
          weekday: sql<number>`extract(isodow from ${localTimestamp(shots.brewedAt, timeZone)})::int`,
          hour: sql<number>`extract(hour from ${localTimestamp(shots.brewedAt, timeZone)})::int`,
          count: shotCountSql,
        })
        .from(shots)
        .where(currentWhere)
        .groupBy(sql`1`, sql`2`),

      db
        .select({ date: shotDateKey, count: shotCountSql })
        .from(shots)
        .where(currentWhere)
        .groupBy(sql`1`)
        .orderBy(sql`1`),

      db
        .select({
          name: roasterName,
          count: shotCountSql,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .leftJoin(roasters, eq(beans.roasterId, roasters.id))
        .where(and(currentWhere, isNotNull(roasterName)))
        .groupBy(roasterName)
        .orderBy(desc(sql`count(*)`))
        .limit(6),

      db
        .select({
          name: beans.origin,
          count: shotCountSql,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(and(currentWhere, isNotNull(beans.origin)))
        .groupBy(beans.origin)
        .orderBy(desc(sql`count(*)`))
        .limit(6),

      db
        .select({
          name: beans.process,
          count: shotCountSql,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(and(currentWhere, isNotNull(beans.process)))
        .groupBy(beans.process)
        .orderBy(desc(sql`count(*)`))
        .limit(6),

      db
        .select({
          name: beans.roastLevel,
          count: shotCountSql,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(and(currentWhere, isNotNull(beans.roastLevel)))
        .groupBy(beans.roastLevel)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          name: roastAgeBucket,
          count: shotCountSql,
          avgRating: averageShotRatingSql,
          sort: sql<number>`min(${roastAgeDays})::int`,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(
          and(
            currentWhere,
            isNotNull(beans.roastDate),
            gte(
              localDate(shots.brewedAt, timeZone),
              sql`date(${beans.roastDate})`,
            ),
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`3`),

      db
        .select({
          recipeId: recipes.id,
          recipeName: recipes.name,
          count: shotCountSql,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(recipes, eq(shots.recipeId, recipes.id))
        .where(currentWhere)
        .groupBy(recipes.id, recipes.name)
        .having(sql`count(*) >= 3`)
        .orderBy(sql`avg(${shots.rating}) desc nulls last`, desc(sql`count(*)`))
        .limit(6),

      db
        .select({
          currency: beans.priceCurrency,
          total: sql<
            string | number
          >`round(sum((${beans.price}::numeric / nullif(${beans.weight}::numeric, 0)) * ${shots.doseGrams}::numeric), 2)`,
          average: sql<
            string | number
          >`round(avg((${beans.price}::numeric / nullif(${beans.weight}::numeric, 0)) * ${shots.doseGrams}::numeric), 2)`,
          count: shotCountSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(
          and(
            currentWhere,
            isNotNull(shots.doseGrams),
            isNotNull(beans.price),
            isNotNull(beans.weight),
            sql`${beans.weight}::numeric > 0`,
          ),
        )
        .groupBy(beans.priceCurrency)
        .orderBy(beans.priceCurrency),

      db
        .select({ id: brewingMethods.id, name: brewingMethods.name })
        .from(brewingMethods)
        .orderBy(brewingMethods.name),

      db
        .select({
          id: beans.id,
          name: beans.name,
          isArchived: beans.isArchived,
        })
        .from(beans)
        .orderBy(beans.name),

      getVisitsAndPlacesStats({ range, timeZone, now }),
    ])

    const summary = summaryRows[0]
    const previous = previousSummaryRows[0]
    const total = summary?.total ?? 0
    const periodDays =
      range.days ??
      (summary?.firstDate
        ? daysBetween(summary.firstDate, range.end)
        : total > 0
          ? 1
          : 0)
    const consistency = consistencyRows[0]
    const metric = (
      count: number | undefined,
      median: string | number | null | undefined,
      p25: string | number | null | undefined,
      p75: string | number | null | undefined,
    ) => ({
      count: count ?? 0,
      median: toNullableNumber(median),
      p25: toNullableNumber(p25),
      p75: toNullableNumber(p75),
    })

    return {
      filter: { ...filter, timeZone, range },
      available: { methods: availableMethods, beans: availableBeans },
      shots: {
        total,
        previousTotal: previous?.total ?? null,
        avgPerDay:
          periodDays > 0 ? Math.round((total / periodDays) * 10) / 10 : 0,
      },
      beans: {
        totalGramsUsed: Math.round(Number(summary?.totalGrams) || 0),
        previousTotalGramsUsed: previous
          ? Math.round(Number(previous.totalGrams) || 0)
          : null,
        uniqueBeansUsed: summary?.uniqueBeans ?? 0,
        topByShots: topBeansByShots,
        topByRating: normalizeRatingAverages(topBeansByRating),
      },
      brewing: {
        avgDose: toNullableNumber(summary?.avgDose),
        avgYield: toNullableNumber(summary?.avgYield),
        avgTime: toNullableNumber(summary?.avgTime),
        avgRatio: toNullableNumber(summary?.avgRatio),
      },
      consistency: {
        dose: metric(
          consistency?.doseCount,
          consistency?.doseMedian,
          consistency?.doseP25,
          consistency?.doseP75,
        ),
        yield: metric(
          consistency?.yieldCount,
          consistency?.yieldMedian,
          consistency?.yieldP25,
          consistency?.yieldP75,
        ),
        time: metric(
          consistency?.timeCount,
          consistency?.timeMedian,
          consistency?.timeP25,
          consistency?.timeP75,
        ),
        ratio: metric(
          consistency?.ratioCount,
          consistency?.ratioMedian,
          consistency?.ratioP25,
          consistency?.ratioP75,
        ),
      },
      gear: {
        brewers: brewerUsage,
        grinders: grinderUsage,
        accessories: accessoryUsage,
      },
      ratings: {
        average: toNullableNumber(summary?.avgRating),
        previousAverage: toNullableNumber(previous?.avgRating),
        totalRated: summary?.totalRated ?? 0,
        previousTotalRated: previous?.totalRated ?? null,
        highRated: summary?.highRated ?? 0,
        distribution: {
          1: summary?.rating1 ?? 0,
          2: summary?.rating2 ?? 0,
          3: summary?.rating3 ?? 0,
          4: summary?.rating4 ?? 0,
          5: summary?.rating5 ?? 0,
        },
      },
      trend: fillBucketSeries(
        qualityTrend.map((row) => ({
          ...row,
          averageRating: toNullableNumber(row.averageRating),
        })),
        range.start ?? summary?.firstDate ?? null,
        range.end,
        range.bucket,
        (date) => ({
          date,
          count: 0,
          averageRating: null,
          totalRated: 0,
          highRated: 0,
        }),
      ),
      methods: normalizeRatingAverages(methodUsage),
      tasteProfile: normalizeRatingAverages(tasteProfile).map((row) => ({
        ...row,
        extractionAxis: toNullableNumber(row.extractionAxis),
        strengthAxis: toNullableNumber(row.strengthAxis),
      })),
      dialIn: dialInRows.map((row) => ({
        ...row,
        rating: row.rating ?? 0,
        ratio: toNullableNumber(row.ratio),
        time: toNullableNumber(row.time),
        temperature: toNullableNumber(row.temperature),
      })),
      rhythm: {
        cells: rhythmRows,
        streaks: calculateStreaks(
          activityDates,
          dateKeyInTimeZone(now, timeZone),
        ),
      },
      exploration: {
        roasters: normalizeRatingAverages(
          roasterUsage.filter((row) => row.name !== null),
        ),
        origins: normalizeRatingAverages(
          originUsage.filter((row) => row.name !== null),
        ),
        processes: normalizeRatingAverages(
          processUsage.filter((row) => row.name !== null),
        ),
        roastLevels: normalizeRatingAverages(
          roastLevelUsage.filter((row) => row.name !== null),
        ),
        roastAge: normalizeRatingAverages(roastAgeUsage),
        recipes: normalizeRatingAverages(recipePerformance),
      },
      cost: {
        home: homeSpend.map((row) => ({
          currency: row.currency ?? 'EUR',
          total: Number(row.total),
          average: Number(row.average),
          count: row.count,
        })),
      },
      ...visitsAndPlaces,
    }
  } catch (error) {
    throw await toDisplayableDatabaseError(error)
  }
}
