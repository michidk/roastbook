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
  roasters,
  shotAccessoryGear,
  shots,
  shotTasteTags,
  tasteTags,
} from '@/db/schema'
import { localDate } from '@/lib/server/stats-sql.server'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

const shotCountSql = sql<number>`count(*)::int`
const averageShotRatingSql = sql<
  string | number | null
>`round(avg(${shots.rating})::numeric, 2)`

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
  const roastAgeDays = sql<number>`(${localDate(shots.brewedAt, timeZone)} - date(${beans.roastDate}))`
  const roastAgeBucket = sql<string>`case
      when ${roastAgeDays} < 7 then '0–6 days'
      when ${roastAgeDays} < 15 then '7–14 days'
      when ${roastAgeDays} < 31 then '15–30 days'
      else '31+ days'
    end`

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
      .where(where)
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
      .where(and(where, isNotNull(shots.rating)))
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
      .where(where)
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
      .where(where)
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
      .where(and(where, isNotNull(roasterName)))
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
      .where(and(where, isNotNull(beans.origin)))
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
      .where(and(where, isNotNull(beans.process)))
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
      .where(and(where, isNotNull(beans.roastLevel)))
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
          where,
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
      .select({ id: brewingMethods.id, name: brewingMethods.name })
      .from(brewingMethods)
      .orderBy(brewingMethods.name),
    db
      .select({ id: beans.id, name: beans.name, isArchived: beans.isArchived })
      .from(beans)
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
