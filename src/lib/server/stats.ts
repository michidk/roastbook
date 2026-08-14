import { createServerFn } from '@tanstack/react-start'
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, cafeVisits, coffeeShops, gear, shots } from '@/db/schema'
import { toDisplayableDatabaseError } from '@/lib/server/database-error.server'
import { getVisitsAndPlacesStats } from '@/lib/server/stats-visits'
import { fillDailyActivity } from '@/lib/stats-activity'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

type ShotGearType = 'grinder' | 'espresso_machine'

const shotCountSql = sql<number>`count(*)::int`
const averageShotRatingSql = sql<
  string | number | null
>`round(avg(${shots.rating})::numeric, 2)`

function getShotCountSince(start?: Date) {
  const query = db.select({ count: shotCountSql }).from(shots)
  return start ? query.where(gte(shots.createdAt, start)) : query
}

const beanShotSelection = {
  beanId: shots.beanId,
  beanName: beans.name,
  shotCount: shotCountSql,
}

function getGearUsage(type: ShotGearType) {
  const joinCondition =
    type === 'grinder'
      ? eq(shots.grinderId, gear.id)
      : eq(shots.machineId, gear.id)
  return db
    .select({
      gearId: gear.id,
      gearName: gear.name,
      shotCount: sql<number>`count(*)::int`,
    })
    .from(gear)
    .innerJoin(shots, joinCondition)
    .where(
      inArray(
        gear.type,
        type === 'grinder'
          ? ['grinder', 'espresso_machine_with_grinder']
          : ['espresso_machine', 'espresso_machine_with_grinder'],
      ),
    )
    .groupBy(gear.id, gear.name)
    .orderBy(desc(sql`count(*)`))
    .limit(5)
}

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      )
      const [shotsCount] = await db.select({ count: count() }).from(shots)
      const [activeBeansCount] = await db
        .select({ count: count() })
        .from(beans)
        .where(eq(beans.isArchived, false))
      const [shotsThisMonthCount] = await db
        .select({ count: count() })
        .from(shots)
        .where(
          and(
            gte(shots.createdAt, startOfMonth),
            lt(shots.createdAt, startOfNextMonth),
          ),
        )
      const [visitsCount] = await db.select({ count: count() }).from(cafeVisits)
      const [coffeeShopsCount] = await db
        .select({ count: count() })
        .from(coffeeShops)

      return {
        totalShots: shotsCount.count,
        activeBeans: activeBeansCount.count,
        shotsThisMonth: shotsThisMonthCount.count,
        cafeVisits: visitsCount.count,
        coffeeShops: coffeeShopsCount.count,
      }
    } catch (error) {
      throw await toDisplayableDatabaseError(error)
    }
  },
)

export const getRecentShots = createServerFn({ method: 'GET' })
  .validator(z.number().int().min(1).max(50).default(5))
  .handler(async ({ data: limit }) => {
    try {
      return await db.query.shots.findMany({
        limit,
        orderBy: (shots, { desc }) => [desc(shots.createdAt)],
        with: {
          bean: {
            with: {
              images: true,
            },
          },
          tasteTags: {
            with: {
              tasteTag: true,
            },
          },
        },
      })
    } catch (error) {
      throw await toDisplayableDatabaseError(error)
    }
  })

export const getDetailedStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalShots,
      shotsThisWeek,
      shotsThisMonth,
      totalBeansUsed,
      ratingStats,
      topBeansByShots,
      topBeansByRating,
      grinderUsage,
      machineUsage,
      brewingAverages,
      recentActivity,
      firstShotDate,
      visitsAndPlaces,
    ] = await Promise.all([
      getShotCountSince(),

      getShotCountSince(startOfWeek),

      getShotCountSince(startOfMonth),

      db
        .select({
          totalGrams: sql<
            string | number
          >`coalesce(sum(${shots.doseGrams}::numeric), 0)::numeric`,
          uniqueBeans: sql<number>`count(distinct ${shots.beanId})::int`,
        })
        .from(shots)
        .where(isNotNull(shots.beanId)),

      db
        .select({
          avgRating: averageShotRatingSql,
          totalRated: sql<number>`count(${shots.rating})::int`,
          rating1: sql<number>`count(*) filter (where ${shots.rating} = 1)::int`,
          rating2: sql<number>`count(*) filter (where ${shots.rating} = 2)::int`,
          rating3: sql<number>`count(*) filter (where ${shots.rating} = 3)::int`,
          rating4: sql<number>`count(*) filter (where ${shots.rating} = 4)::int`,
          rating5: sql<number>`count(*) filter (where ${shots.rating} = 5)::int`,
        })
        .from(shots)
        .where(isNotNull(shots.rating)),

      db
        .select(beanShotSelection)
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .groupBy(shots.beanId, beans.name)
        .orderBy(desc(sql`count(*)`))
        .limit(5),

      db
        .select({
          ...beanShotSelection,
          avgRating: averageShotRatingSql,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(isNotNull(shots.rating))
        .groupBy(shots.beanId, beans.name)
        .having(sql`count(*) >= 3`)
        .orderBy(desc(sql`avg(${shots.rating})`))
        .limit(5),

      getGearUsage('grinder'),

      getGearUsage('espresso_machine'),

      db
        .select({
          avgDose: sql<
            string | number | null
          >`round(avg(${shots.doseGrams}::numeric), 1)`,
          avgYield: sql<
            string | number | null
          >`round(avg(${shots.yieldGrams}::numeric), 1)`,
          avgTime: sql<
            string | number | null
          >`round(avg(${shots.shotTimeSeconds})::numeric, 0)::int`,
          avgRatio: sql<
            string | number | null
          >`round(avg(${shots.yieldGrams}::numeric / nullif(${shots.doseGrams}::numeric, 0)), 2)`,
        })
        .from(shots)
        .where(and(isNotNull(shots.doseGrams), isNotNull(shots.yieldGrams))),

      db
        .select({
          date: sql<string>`date(${shots.createdAt})`,
          count: sql<number>`count(*)::int`,
        })
        .from(shots)
        .where(
          gte(
            shots.createdAt,
            new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          ),
        )
        .groupBy(sql`date(${shots.createdAt})`)
        .orderBy(sql`date(${shots.createdAt})`),

      db.select({ date: sql<Date>`min(${shots.createdAt})` }).from(shots),

      getVisitsAndPlacesStats(startOfMonth),
    ])

    const daysSinceFirst = firstShotDate[0]?.date
      ? Math.ceil(
          (now.getTime() - new Date(firstShotDate[0].date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0

    const avgShotsPerDay =
      daysSinceFirst > 0 ? (totalShots[0]?.count || 0) / daysSinceFirst : 0

    return {
      shots: {
        total: totalShots[0]?.count || 0,
        thisWeek: shotsThisWeek[0]?.count || 0,
        thisMonth: shotsThisMonth[0]?.count || 0,
        avgPerDay: Math.round(avgShotsPerDay * 10) / 10,
      },
      beans: {
        totalGramsUsed: Math.round(Number(totalBeansUsed[0]?.totalGrams) || 0),
        uniqueBeansUsed: totalBeansUsed[0]?.uniqueBeans || 0,
        topByShots: topBeansByShots,
        topByRating: normalizeRatingAverages(topBeansByRating),
      },
      brewing: {
        avgDose: toNullableNumber(brewingAverages[0]?.avgDose),
        avgYield: toNullableNumber(brewingAverages[0]?.avgYield),
        avgTime: toNullableNumber(brewingAverages[0]?.avgTime),
        avgRatio: toNullableNumber(brewingAverages[0]?.avgRatio),
      },
      gear: {
        grinders: grinderUsage,
        machines: machineUsage,
      },
      ratings: {
        average: toNullableNumber(ratingStats[0]?.avgRating),
        totalRated: ratingStats[0]?.totalRated ?? 0,
        distribution: {
          1: ratingStats[0]?.rating1 ?? 0,
          2: ratingStats[0]?.rating2 ?? 0,
          3: ratingStats[0]?.rating3 ?? 0,
          4: ratingStats[0]?.rating4 ?? 0,
          5: ratingStats[0]?.rating5 ?? 0,
        },
      },
      activity: fillDailyActivity(recentActivity, now),
      ...visitsAndPlaces,
    }
  },
)
