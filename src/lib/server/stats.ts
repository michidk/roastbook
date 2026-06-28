import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { beans, gear, shots, cafeVisits, places, recipeGear } from "@/db/schema"
import { eq, count, sql, gte, desc, isNotNull, and } from "drizzle-orm"
import { toDisplayableDatabaseError } from "@/lib/server/database-error"

export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const [shotsCount] = await db.select({ count: count() }).from(shots)
      const [activeBeansCount] = await db
        .select({ count: count() })
        .from(beans)
        .where(eq(beans.isArchived, false))
      const [gearCount] = await db
        .select({ count: count() })
        .from(gear)
        .where(eq(gear.isArchived, false))
      const [visitsCount] = await db.select({ count: count() }).from(cafeVisits)
      const [placesCount] = await db.select({ count: count() }).from(places)

      return {
        totalShots: shotsCount.count,
        activeBeans: activeBeansCount.count,
        gearCount: gearCount.count,
        cafeVisits: visitsCount.count,
        places: placesCount.count,
      }
    } catch (error) {
      throw await toDisplayableDatabaseError(error)
    }
  }
)

export const getRecentShots = createServerFn({ method: "GET" })
  .validator((limit: number = 5) => limit)
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

export const getDetailedStats = createServerFn({ method: "GET" }).handler(
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
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(shots),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(shots)
        .where(gte(shots.createdAt, startOfWeek)),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(shots)
        .where(gte(shots.createdAt, startOfMonth)),

      db
        .select({
          totalGrams: sql<number>`coalesce(sum(${shots.doseGrams}::numeric), 0)::numeric`,
          uniqueBeans: sql<number>`count(distinct ${shots.beanId})::int`,
        })
        .from(shots)
        .where(isNotNull(shots.beanId)),

      db
        .select({
          avgRating: sql<number>`round(avg(${shots.rating})::numeric, 2)`,
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
        .select({
          beanId: shots.beanId,
          beanName: beans.name,
          shotCount: sql<number>`count(*)::int`,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .groupBy(shots.beanId, beans.name)
        .orderBy(desc(sql`count(*)`))
        .limit(5),

      db
        .select({
          beanId: shots.beanId,
          beanName: beans.name,
          avgRating: sql<number>`round(avg(${shots.rating})::numeric, 2)`,
          shotCount: sql<number>`count(*)::int`,
        })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(isNotNull(shots.rating))
        .groupBy(shots.beanId, beans.name)
        .having(sql`count(*) >= 3`)
        .orderBy(desc(sql`avg(${shots.rating})`))
        .limit(5),

      db
        .select({
          gearId: gear.id,
          gearName: gear.name,
          shotCount: sql<number>`count(*)::int`,
        })
        .from(gear)
        .innerJoin(recipeGear, eq(recipeGear.gearId, gear.id))
        .innerJoin(shots, eq(shots.recipeId, recipeGear.recipeId))
        .where(eq(gear.type, "grinder"))
        .groupBy(gear.id, gear.name)
        .orderBy(desc(sql`count(*)`))
        .limit(5),

      db
        .select({
          gearId: gear.id,
          gearName: gear.name,
          shotCount: sql<number>`count(*)::int`,
        })
        .from(gear)
        .innerJoin(recipeGear, eq(recipeGear.gearId, gear.id))
        .innerJoin(shots, eq(shots.recipeId, recipeGear.recipeId))
        .where(eq(gear.type, "espresso_machine"))
        .groupBy(gear.id, gear.name)
        .orderBy(desc(sql`count(*)`))
        .limit(5),

      db
        .select({
          avgDose: sql<number>`round(avg(${shots.doseGrams}::numeric), 1)`,
          avgYield: sql<number>`round(avg(${shots.yieldGrams}::numeric), 1)`,
          avgTime: sql<number>`round(avg(${shots.brewTimeSeconds})::numeric, 0)::int`,
          avgRatio: sql<number>`round(avg(${shots.yieldGrams}::numeric / nullif(${shots.doseGrams}::numeric, 0)), 2)`,
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
          gte(shots.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
        )
        .groupBy(sql`date(${shots.createdAt})`)
        .orderBy(sql`date(${shots.createdAt})`),

      db.select({ date: sql<Date>`min(${shots.createdAt})` }).from(shots),
    ])

    const daysSinceFirst = firstShotDate[0]?.date
      ? Math.ceil(
          (now.getTime() - new Date(firstShotDate[0].date).getTime()) /
            (1000 * 60 * 60 * 24)
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
        topByRating: topBeansByRating,
      },
      brewing: {
        avgDose: brewingAverages[0]?.avgDose,
        avgYield: brewingAverages[0]?.avgYield,
        avgTime: brewingAverages[0]?.avgTime,
        avgRatio: brewingAverages[0]?.avgRatio,
      },
      gear: {
        grinders: grinderUsage,
        machines: machineUsage,
      },
      ratings: {
        average: ratingStats[0]?.avgRating ?? null,
        totalRated: ratingStats[0]?.totalRated ?? 0,
        distribution: {
          1: ratingStats[0]?.rating1 ?? 0,
          2: ratingStats[0]?.rating2 ?? 0,
          3: ratingStats[0]?.rating3 ?? 0,
          4: ratingStats[0]?.rating4 ?? 0,
          5: ratingStats[0]?.rating5 ?? 0,
        },
      },
      activity: recentActivity,
    }
  }
)
