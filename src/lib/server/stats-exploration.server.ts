import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  notInArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { db } from '@/db'
import { journalOwnerId, owned } from '@/db/journal-scope.server'
import {
  beanPurchases,
  beans,
  brewingMethods,
  gear,
  roasters,
  shotAccessoryGear,
  shots,
  shotTasteTags,
  tasteTags,
} from '@/db/schema'
import {
  STATS_SCAN_PAGE_SIZE,
  scanStatsRows,
} from '@/lib/server/stats-scan.server'
import { dateKeyInTimeZone, daysBetween } from '@/lib/stats-filters'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

const shotCountSql = sql<number>`cast(count(*) as integer)`
const averageShotRatingSql = sql<
  string | number | null
>`round(cast(avg(${shots.rating}) as numeric), 2)`

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
              where ${owned(shotAccessoryGear)} and ${shotAccessoryGear.shotId} = ${shots.id}
                and ${shotAccessoryGear.gearId} = ${gear.id}
            )`,
          )
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
      shotCount: sql<number>`cast(count(distinct ${shots.id}) as integer)`,
    })
    .from(gear)
    .innerJoin(shots, joinCondition)
    .where(owned(gear, and(where, roleCondition)))
    .groupBy(gear.id, gear.name, gear.type)
    .orderBy(desc(sql`count(distinct ${shots.id})`), gear.name)
    .limit(6)
}

async function loadRoastAge(where: SQL, timeZone: string) {
  const groups = new Map<
    string,
    { count: number; ratingSum: number; rated: number; sort: number }
  >()
  await scanStatsRows(
    (afterId) =>
      db
        .select({
          id: shots.id,
          brewedAt: shots.brewedAt,
          roastDate: beanPurchases.roastDate,
          rating: shots.rating,
        })
        .from(shots)
        .innerJoin(
          beanPurchases,
          and(
            eq(shots.beanPurchaseId, beanPurchases.id),
            eq(shots.ownerId, beanPurchases.ownerId),
          ),
        )
        .where(
          owned(
            shots,
            and(
              where,
              isNotNull(beanPurchases.roastDate),
              afterId === undefined ? undefined : gt(shots.id, afterId),
            ),
          ),
        )
        .orderBy(asc(shots.id))
        .limit(STATS_SCAN_PAGE_SIZE),
    (row) => {
      if (!row.roastDate) return
      const age =
        daysBetween(
          row.roastDate.toISOString().slice(0, 10),
          dateKeyInTimeZone(row.brewedAt, timeZone),
        ) - 1
      if (age < 0) return
      const name =
        age < 7
          ? '0–6 days'
          : age < 15
            ? '7–14 days'
            : age < 31
              ? '15–30 days'
              : '31+ days'
      const group = groups.get(name) ?? {
        count: 0,
        ratingSum: 0,
        rated: 0,
        sort: age,
      }
      group.count += 1
      group.sort = Math.min(group.sort, age)
      if (row.rating !== null) {
        group.ratingSum += row.rating
        group.rated += 1
      }
      groups.set(name, group)
    },
  )
  return [...groups]
    .map(([name, group]) => ({
      name,
      count: group.count,
      avgRating: group.rated
        ? Math.round((group.ratingSum / group.rated) * 100) / 100
        : null,
      sort: group.sort,
    }))
    .sort((left, right) => left.sort - right.sort)
}

export async function loadStatsExploration({
  where,
  timeZone,
}: {
  readonly where: SQL<unknown>
  readonly timeZone: string
}) {
  const roasterName = sql<
    string | null
  >`coalesce(${roasters.name}, ${beans.roaster})`
  const roastAgePromise = loadRoastAge(where, timeZone)

  const [
    topByShots,
    topByRating,
    brewers,
    grinders,
    accessories,
    methods,
    tasteProfile,
    roasterUsage,
    originUsage,
    processUsage,
    roastLevelUsage,
    roastAgeUsage,
    availableMethods,
    availableBeans,
  ] = await Promise.all([
    db
      .select({
        beanId: beans.id,
        beanName: beans.name,
        shotCount: shotCountSql,
      })
      .from(shots)
      .innerJoin(beans, eq(shots.beanId, beans.id))
      .where(owned(shots, where))
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
      .where(owned(shots, and(where, isNotNull(shots.rating))))
      .groupBy(beans.id, beans.name)
      .having(sql`count(*) >= 3`)
      .orderBy(desc(sql`avg(${shots.rating})`), desc(sql`count(*)`), beans.name)
      .limit(5),
    getGearUsage('brewer', where),
    getGearUsage('grinder', where),
    getGearUsage('accessory', where),
    db
      .select({
        methodId: brewingMethods.id,
        methodName: brewingMethods.name,
        shotCount: shotCountSql,
        avgRating: averageShotRatingSql,
      })
      .from(shots)
      .innerJoin(brewingMethods, eq(shots.brewingMethodId, brewingMethods.id))
      .where(owned(shots, where))
      .groupBy(brewingMethods.id, brewingMethods.name)
      .orderBy(desc(sql`count(*)`), brewingMethods.name),
    db
      .select({
        id: tasteTags.id,
        name: tasteTags.name,
        category: tasteTags.category,
        count: sql<number>`cast(count(distinct ${shots.id}) as integer)`,
        avgRating: averageShotRatingSql,
        extractionAxis: tasteTags.extractionAxis,
        strengthAxis: tasteTags.strengthAxis,
      })
      .from(shotTasteTags)
      .innerJoin(shots, eq(shotTasteTags.shotId, shots.id))
      .innerJoin(tasteTags, eq(shotTasteTags.tasteTagId, tasteTags.id))
      .where(owned(shotTasteTags, where))
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
        name: roasterName,
        count: shotCountSql,
        avgRating: averageShotRatingSql,
      })
      .from(shots)
      .innerJoin(beans, eq(shots.beanId, beans.id))
      .leftJoin(roasters, eq(beans.roasterId, roasters.id))
      .where(owned(shots, and(where, isNotNull(roasterName))))
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
      .where(owned(shots, and(where, isNotNull(beans.origin))))
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
      .where(owned(shots, and(where, isNotNull(beans.process))))
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
      .where(owned(shots, and(where, isNotNull(beans.roastLevel))))
      .groupBy(beans.roastLevel)
      .orderBy(desc(sql`count(*)`)),
    roastAgePromise,
    db
      .select({ id: brewingMethods.id, name: brewingMethods.name })
      .from(brewingMethods)
      .where(owned(brewingMethods))
      .orderBy(brewingMethods.name),
    db
      .select({
        id: beans.id,
        name: beans.name,
        isArchived:
          sql<boolean>`not exists (select 1 from "bean_purchases" as "available_purchases" where "available_purchases"."owner_id" = ${journalOwnerId()} and "available_purchases"."bean_id" = "beans"."id" and "available_purchases"."is_archived" = false)`.mapWith(
            Boolean,
          ),
      })
      .from(beans)
      .where(owned(beans))
      .orderBy(beans.name),
  ])

  return {
    beans: {
      topByShots,
      topByRating: normalizeRatingAverages(topByRating),
    },
    gear: { brewers, grinders, accessories },
    methods: normalizeRatingAverages(methods),
    tasteProfile: normalizeRatingAverages(tasteProfile).map((row) => ({
      ...row,
      extractionAxis: toNullableNumber(row.extractionAxis),
      strengthAxis: toNullableNumber(row.strengthAxis),
    })),
    exploration: {
      roasters: normalizeRatingAverages(roasterUsage),
      origins: normalizeRatingAverages(originUsage),
      processes: normalizeRatingAverages(processUsage),
      roastLevels: normalizeRatingAverages(roastLevelUsage),
      roastAge: normalizeRatingAverages(roastAgeUsage),
    },
    available: { methods: availableMethods, beans: availableBeans },
  }
}
