import { calculateStreaks, fillBucketSeries } from '@/lib/stats-analysis'
import {
  dateKeyInTimeZone,
  daysBetween,
  parseStatsFilter,
  resolveStatsRange,
} from '@/lib/stats-filters'
import { continuousPercentiles, createLocalActivity } from '@/lib/stats-local'
import type { DetailedStats } from '@/modules/stats/read-models'
import type { JournalViews } from './views'

const round = (number: number) => Math.round(number * 100) / 100
function average(values: readonly (number | null)[]) {
  const present = values.filter((value): value is number => value !== null)
  return present.length
    ? round(present.reduce((sum, value) => sum + value, 0) / present.length)
    : null
}
function number(value: string | null) {
  return value === null ? null : Number(value)
}
function grouped<T>(
  rows: readonly T[],
  key: (row: T) => string | null,
  rating: (row: T) => number | null,
  limit = 6,
) {
  const keys = [...new Set(rows.map(key))].filter(
    (key): key is string => key !== null,
  )
  return keys
    .map((name) => {
      const members = rows.filter((row) => key(row) === name)
      return {
        name,
        count: members.length,
        avgRating: average(members.map(rating)),
      }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}
function money<T>(
  rows: readonly T[],
  price: (row: T) => number | null,
  currency: (row: T) => string | null,
) {
  return [...new Set(rows.map(currency))]
    .map((value) => {
      const prices = rows
        .filter((row) => currency(row) === value)
        .map(price)
        .filter((value): value is number => value !== null)
      return {
        currency: value ?? 'EUR',
        total: round(prices.reduce((sum, value) => sum + value, 0)),
        average: average(prices) ?? 0,
        count: prices.length,
      }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

export function detailedLocalStats(
  view: JournalViews,
  input: unknown,
  now: Date,
): DetailedStats {
  const filter = parseStatsFilter(input)
  const timeZone = view.tables.settings[0]?.timeZone ?? 'UTC'
  const range = resolveStatsRange(filter, now, timeZone)
  const today = dateKeyInTimeZone(now, timeZone)
  const inRange = (date: Date, start: string | null, end: string) => {
    const day = dateKeyInTimeZone(date, timeZone)
    return (!start || day >= start) && day <= end
  }
  const all = view
    .shots()
    .filter(
      (row) =>
        (!filter.method || row.brewingMethodId === filter.method) &&
        (!filter.bean || row.beanId === filter.bean),
    )
  const shots = all.filter((row) =>
    inRange(row.brewedAt, range.start, range.end),
  )
  const previous =
    range.previousStart && range.previousEnd
      ? all.filter((row) =>
          inRange(row.brewedAt, range.previousStart, range.previousEnd ?? ''),
        )
      : null
  const activity = createLocalActivity(timeZone, range.bucket)
  for (const shot of shots) activity.add(shot.brewedAt, shot.rating)
  const localized = activity.result()
  const calendar = createLocalActivity(timeZone, 'day')
  for (const shot of all) calendar.add(shot.brewedAt)
  const ratio = (row: (typeof shots)[number]) =>
    Number(row.doseGrams) > 0
      ? number(
          row.ratioBasis === 'brew_water' ? row.brewWaterGrams : row.yieldGrams,
        ) === null
        ? null
        : Number(
            row.ratioBasis === 'brew_water'
              ? row.brewWaterGrams
              : row.yieldGrams,
          ) / Number(row.doseGrams)
      : null
  const beans = view
    .beans()
    .map((bean) => {
      const rows = shots.filter((shot) => shot.beanId === bean.id)
      return {
        beanId: bean.id,
        beanName: bean.name,
        shotCount: rows.length,
        avgRating: average(rows.map((row) => row.rating)),
      }
    })
    .filter((row) => row.shotCount > 0)
  const gearUsage = (role: 'brewers' | 'grinders' | 'accessories') =>
    view
      .gear()
      .map((gear) => ({
        gearId: gear.id,
        gearName: gear.name,
        gearType: gear.type,
        shotCount: shots.filter((shot) =>
          role === 'brewers'
            ? shot.machineId === gear.id
            : role === 'grinders'
              ? shot.grinderId === gear.id
              : shot.basketId === gear.id ||
                shot.accessoryGearIds.includes(gear.id),
        ).length,
      }))
      .filter((row) => row.shotCount > 0)
      .sort(
        (a, b) =>
          b.shotCount - a.shotCount || a.gearName.localeCompare(b.gearName),
      )
      .slice(0, 6)
  const tagUsage = view
    .all('tasteTags')
    .map((tag) => {
      const rows = shots.filter((shot) =>
        shot.tasteTags.some((link) => link.tasteTagId === tag.id),
      )
      return {
        id: tag.id,
        name: tag.name,
        category: tag.category,
        count: rows.length,
        avgRating: average(rows.map((row) => row.rating)),
        extractionAxis: number(tag.extractionAxis),
        strengthAxis: number(tag.strengthAxis),
      }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
  const roastAges = shots.flatMap((shot) => {
    const purchase = view.find('beanPurchases', shot.beanPurchaseId)
    if (!purchase?.roastDate) return []
    const age =
      daysBetween(
        purchase.roastDate.toISOString().slice(0, 10),
        dateKeyInTimeZone(shot.brewedAt, timeZone),
      ) - 1
    return age < 0
      ? []
      : [
          {
            name:
              age < 7
                ? '0–6 days'
                : age < 15
                  ? '7–14 days'
                  : age < 31
                    ? '15–30 days'
                    : '31+ days',
            age,
            rating: shot.rating,
          },
        ]
  })
  const visits = view
    .visits()
    .filter((row) => inRange(row.visitedAt, range.start, range.end))
  const previousVisits =
    range.previousStart && range.previousEnd
      ? view
          .visits()
          .filter((row) =>
            inRange(
              row.visitedAt,
              range.previousStart,
              range.previousEnd ?? '',
            ),
          )
      : null
  const visitActivity = createLocalActivity(timeZone, range.bucket)
  for (const visit of visits) visitActivity.add(visit.visitedAt, visit.rating)
  const visitLocalized = visitActivity.result()
  const start = range.start ?? localized.firstDate
  return {
    filter: { ...filter, timeZone, range },
    available: {
      methods: view.methods().map(({ id, name }) => ({ id, name })),
      beans: view
        .beans()
        .map(({ id, name, isArchived }) => ({ id, name, isArchived })),
    },
    shots: {
      total: shots.length,
      previousTotal: previous?.length ?? null,
      avgPerDay: start
        ? Math.round((shots.length / daysBetween(start, range.end)) * 10) / 10
        : 0,
    },
    beans: {
      totalGramsUsed: Math.round(
        shots.reduce((sum, row) => sum + Number(row.doseGrams ?? 0), 0),
      ),
      previousTotalGramsUsed: previous
        ? Math.round(
            previous.reduce((sum, row) => sum + Number(row.doseGrams ?? 0), 0),
          )
        : null,
      uniqueBeansUsed: beans.length,
      topByShots: [...beans]
        .sort(
          (a, b) =>
            b.shotCount - a.shotCount || a.beanName.localeCompare(b.beanName),
        )
        .slice(0, 5)
        .map(({ beanId, beanName, shotCount }) => ({
          beanId,
          beanName,
          shotCount,
        })),
      topByRating: [...beans]
        .map((row) => {
          const rated = shots.filter(
            (shot) => shot.beanId === row.beanId && shot.rating !== null,
          )
          return {
            ...row,
            shotCount: rated.length,
            avgRating: average(rated.map((shot) => shot.rating)),
          }
        })
        .filter((row) => row.shotCount >= 3)
        .sort(
          (a, b) =>
            (b.avgRating ?? 0) - (a.avgRating ?? 0) ||
            b.shotCount - a.shotCount ||
            a.beanName.localeCompare(b.beanName),
        )
        .slice(0, 5),
    },
    brewing: {
      avgDose: average(shots.map((row) => number(row.doseGrams))),
      avgYield: average(shots.map((row) => number(row.yieldGrams))),
      avgTime: average(shots.map((row) => number(row.shotTimeSeconds))),
      avgRatio: average(shots.map(ratio)),
    },
    consistency: {
      dose: continuousPercentiles(
        shots.flatMap((row) =>
          row.doseGrams === null ? [] : [Number(row.doseGrams)],
        ),
      ),
      yield: continuousPercentiles(
        shots.flatMap((row) =>
          row.yieldGrams === null ? [] : [Number(row.yieldGrams)],
        ),
      ),
      time: continuousPercentiles(
        shots.flatMap((row) =>
          row.shotTimeSeconds === null ? [] : [Number(row.shotTimeSeconds)],
        ),
      ),
      ratio: continuousPercentiles(
        shots.flatMap((row) => {
          const value = ratio(row)
          return value === null ? [] : [value]
        }),
      ),
    },
    gear: {
      brewers: gearUsage('brewers'),
      grinders: gearUsage('grinders'),
      accessories: gearUsage('accessories'),
    },
    ratings: {
      average: average(shots.map((row) => row.rating)),
      previousAverage: previous
        ? average(previous.map((row) => row.rating))
        : null,
      totalRated: shots.filter((row) => row.rating !== null).length,
      previousTotalRated:
        previous?.filter((row) => row.rating !== null).length ?? null,
      highRated: shots.filter((row) => (row.rating ?? 0) >= 4).length,
      distribution: {
        1: shots.filter((row) => row.rating === 1).length,
        2: shots.filter((row) => row.rating === 2).length,
        3: shots.filter((row) => row.rating === 3).length,
        4: shots.filter((row) => row.rating === 4).length,
        5: shots.filter((row) => row.rating === 5).length,
      },
    },
    trend: fillBucketSeries(
      localized.trend,
      start,
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
    activityCalendar: { end: today, days: calendar.result().activityDates },
    methods: view
      .methods()
      .map((method) => {
        const rows = shots.filter((row) => row.brewingMethodId === method.id)
        return {
          methodId: method.id,
          methodName: method.name,
          shotCount: rows.length,
          avgRating: average(rows.map((row) => row.rating)),
        }
      })
      .filter((row) => row.shotCount > 0),
    tasteProfile: tagUsage,
    dialIn: [...shots]
      .filter(
        (row) =>
          row.beanId !== null &&
          row.bean !== null &&
          row.rating !== null &&
          row.brewingMethod !== null,
      )
      .sort((a, b) => b.brewedAt.getTime() - a.brewedAt.getTime())
      .slice(0, 100)
      .flatMap((row) =>
        row.bean && row.brewingMethod
          ? [
              {
                id: row.id,
                brewedAt: row.brewedAt,
                beanId: row.bean.id,
                beanName: row.bean.name,
                methodId: row.brewingMethod.id,
                methodName: row.brewingMethod.name,
                rating: row.rating ?? 0,
                ratio: ratio(row),
                time: number(row.shotTimeSeconds),
                temperature: number(row.brewTemperatureCelsius),
              },
            ]
          : [],
      ),
    rhythm: {
      cells: localized.rhythm,
      streaks: calculateStreaks(localized.activityDates, today),
    },
    exploration: {
      roasters: grouped(
        shots,
        (row) => row.bean?.roasterRef?.name ?? row.bean?.roaster ?? null,
        (row) => row.rating,
      ),
      origins: grouped(
        shots,
        (row) => row.bean?.origin ?? null,
        (row) => row.rating,
      ),
      processes: grouped(
        shots,
        (row) => row.bean?.process ?? null,
        (row) => row.rating,
      ),
      roastLevels: grouped(
        shots,
        (row) => row.bean?.roastLevel ?? null,
        (row) => row.rating,
      ),
      roastAge: grouped(
        roastAges,
        (row) => row.name,
        (row) => row.rating,
      )
        .map((row) => ({
          ...row,
          sort: Math.min(
            ...roastAges
              .filter((age) => age.name === row.name)
              .map((age) => age.age),
          ),
        }))
        .sort((a, b) => a.sort - b.sort),
    },
    cost: {
      home: money(
        shots,
        (row) => {
          const purchase = view.find('beanPurchases', row.beanPurchaseId)
          return purchase?.price !== null &&
            purchase?.price !== undefined &&
            Number(purchase.initialWeightGrams) > 0 &&
            row.doseGrams !== null
            ? (Number(purchase.price) * Number(row.doseGrams)) /
                Number(purchase.initialWeightGrams)
            : null
        },
        (row) =>
          view.find('beanPurchases', row.beanPurchaseId)?.priceCurrency ?? null,
      ),
    },
    visits: {
      total: visits.length,
      previousTotal: previousVisits?.length ?? null,
      averageRating: average(visits.map((row) => row.rating)),
      previousAverageRating: previousVisits
        ? average(previousVisits.map((row) => row.rating))
        : null,
      totalRated: visits.filter((row) => row.rating !== null).length,
      trend: fillBucketSeries(
        visitLocalized.trend,
        range.start ?? visitLocalized.firstDate,
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
      drinkTypes: grouped(
        visits,
        (row) => row.drinkType?.name ?? null,
        (row) => row.rating,
      ),
      cities: grouped(
        visits,
        (row) => row.coffeeShop?.city ?? null,
        (row) => row.rating,
      ),
      tasteTags: view
        .all('tasteTags')
        .map((tag) => {
          const rows = visits.filter((row) =>
            row.tasteTags.some((link) => link.tasteTagId === tag.id),
          )
          return {
            id: tag.id,
            name: tag.name,
            category: tag.category,
            count: rows.length,
            avgRating: average(rows.map((row) => row.rating)),
          }
        })
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      spend: money(
        visits,
        (row) => number(row.price),
        (row) => row.currency,
      ),
      streaks: calculateStreaks(visitLocalized.activityDates, today),
    },
    places: {
      total: view.tables.coffeeShops.length,
      visited: new Set(
        visits.map((row) => row.coffeeShopId).filter((id) => id !== null),
      ).size,
      favorites: view.tables.coffeeShops.filter((row) => row.isFavorite).length,
      topByVisits: view
        .places()
        .map((place) => {
          const rows = visits.filter((row) => row.coffeeShopId === place.id)
          return {
            coffeeShopId: place.id,
            coffeeShopName: place.name,
            city: place.city,
            visitCount: rows.length,
            avgRating: average(rows.map((row) => row.rating)),
          }
        })
        .filter((row) => row.visitCount > 0)
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 6),
    },
  }
}
