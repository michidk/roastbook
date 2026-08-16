import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { brewingMethods, gear, shots } from '@/db/schema'
import { isResearchEnabled, recommendShotFromHistory } from '@/lib/ai'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
  isShotParameterKey,
  type ShotParameterKey,
} from '@/lib/shot-parameters'
import {
  haveSameAccessoryGear,
  type ShotRecommendationContext,
  shotRecommendationRequestSchema,
} from '@/lib/shot-recommendation'

const RECOMMENDATION_HISTORY_LIMIT = 50

type RecommendationSetup = {
  readonly beanId: number
  readonly brewingMethodId: number
  readonly machineId: number | null
  readonly grinderId: number | null
  readonly basketId: number | null
  readonly accessoryGearIds: readonly number[]
}

const recommendationShotRelations = {
  tasteTags: { with: { tasteTag: true } },
  accessoryGearLinks: { columns: { gearId: true } },
} as const

class ShotRecommendationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShotRecommendationError'
  }
}

function normalizedAccessoryIds(ids: readonly number[]) {
  return [...new Set(ids)].sort((left, right) => left - right)
}

async function resolveSetup(
  request: ReturnType<typeof shotRecommendationRequestSchema.parse>,
): Promise<RecommendationSetup> {
  const latestShot = await db.query.shots.findFirst({
    where: request.brewingMethodId
      ? and(
          eq(shots.beanId, request.beanId),
          eq(shots.brewingMethodId, request.brewingMethodId),
        )
      : eq(shots.beanId, request.beanId),
    orderBy: [desc(shots.createdAt), desc(shots.id)],
    columns: {
      beanId: true,
      brewingMethodId: true,
      machineId: true,
      grinderId: true,
      basketId: true,
    },
    with: { accessoryGearLinks: { columns: { gearId: true } } },
  })
  if (!latestShot?.beanId) {
    throw new ShotRecommendationError(
      request.brewingMethodId
        ? 'Log a brew for these beans and brewing method before requesting a recommendation.'
        : 'Log a brew for these beans before requesting a recommendation.',
    )
  }

  return {
    beanId: request.beanId,
    brewingMethodId: latestShot.brewingMethodId,
    machineId: latestShot.machineId,
    grinderId: latestShot.grinderId,
    basketId: latestShot.basketId,
    accessoryGearIds: normalizedAccessoryIds(
      latestShot.accessoryGearLinks.map((link) => link.gearId),
    ),
  }
}

function setupConditions(setup: RecommendationSetup) {
  return and(
    eq(shots.beanId, setup.beanId),
    eq(shots.brewingMethodId, setup.brewingMethodId),
    setup.machineId === null
      ? isNull(shots.machineId)
      : eq(shots.machineId, setup.machineId),
    setup.grinderId === null
      ? isNull(shots.grinderId)
      : eq(shots.grinderId, setup.grinderId),
    setup.basketId === null
      ? isNull(shots.basketId)
      : eq(shots.basketId, setup.basketId),
  )
}

function shotParameters(
  shot: typeof shots.$inferSelect,
  accessoryGearIds: readonly number[],
  enabledParameters: readonly string[],
) {
  const values = {
    machineId: shot.machineId,
    doseGrams: shot.doseGrams,
    brewWaterGrams: shot.brewWaterGrams,
    ratioBasis: shot.ratioBasis,
    grinderId: shot.grinderId,
    grindSetting: shot.grindSetting,
    yieldGrams: shot.yieldGrams,
    shotTimeSeconds: shot.shotTimeSeconds,
    brewTemperatureCelsius: shot.brewTemperatureCelsius,
    preinfusionTimeSeconds: shot.preinfusionTimeSeconds,
    preinfusionPressureBar: shot.preinfusionPressureBar,
    bloomTimeSeconds: shot.bloomTimeSeconds,
    brewPressureBar: shot.brewPressureBar,
    flowRateMlPerSecond: shot.flowRateMlPerSecond,
    basketId: shot.basketId,
    usesPuckScreen: shot.usesPuckScreen,
    paperFilterPosition: shot.paperFilterPosition,
    distributionMethod: shot.distributionMethod,
    tampForceKg: shot.tampForceKg,
    accessoryGearIds,
  } satisfies Record<ShotParameterKey, unknown>

  return Object.fromEntries(
    enabledParameters
      .filter(isShotParameterKey)
      .map((key) => [key, values[key]]),
  )
}

function achievedRatio(shot: typeof shots.$inferSelect) {
  const beverageValue =
    shot.ratioBasis === 'brew_water' ? shot.brewWaterGrams : shot.yieldGrams
  if (shot.doseGrams === null || beverageValue === null) return null
  const dose = Number(shot.doseGrams)
  const beverage = Number(beverageValue)
  if (!Number.isFinite(dose) || dose <= 0 || !Number.isFinite(beverage)) {
    return null
  }
  return `1:${(beverage / dose).toFixed(2)}`
}

export const checkShotRecommendationEnabled = createServerFn({
  method: 'GET',
}).handler(async () => ({ enabled: isResearchEnabled() }))

export const getShotRecommendation = createServerFn({ method: 'POST' })
  .validator(shotRecommendationRequestSchema)
  .handler(async ({ data: request }) => {
    if (!isResearchEnabled()) {
      throw new ShotRecommendationError('AI recommendations are not configured')
    }

    const setup = await resolveSetup(request)
    const candidateShots = await db.query.shots.findMany({
      where: setupConditions(setup),
      orderBy: [desc(shots.createdAt), desc(shots.id)],
      columns: { id: true },
      with: { accessoryGearLinks: { columns: { gearId: true } } },
    })
    const matchingShots = candidateShots.filter((shot) =>
      haveSameAccessoryGear(
        shot.accessoryGearLinks.map((link) => link.gearId),
        setup.accessoryGearIds,
      ),
    )
    if (matchingShots.length === 0) {
      throw new ShotRecommendationError(
        'No previous brews match this bean, method, and exact gear setup.',
      )
    }

    const includedIds = matchingShots
      .slice(0, RECOMMENDATION_HISTORY_LIMIT)
      .map((shot) => shot.id)
    const gearIds = normalizedAccessoryIds(
      [setup.machineId, setup.grinderId, setup.basketId]
        .filter((id): id is number => id !== null)
        .concat(setup.accessoryGearIds),
    )
    const [bean, brewingMethod, matchingHistory, selectedGear] =
      await Promise.all([
        db.query.beans.findFirst({
          where: (beans, { eq }) => eq(beans.id, setup.beanId),
          with: { roasterRef: true },
        }),
        db.query.brewingMethods.findFirst({
          where: eq(brewingMethods.id, setup.brewingMethodId),
        }),
        db.query.shots.findMany({
          where: inArray(shots.id, includedIds),
          orderBy: [asc(shots.createdAt), asc(shots.id)],
          with: recommendationShotRelations,
        }),
        gearIds.length === 0
          ? Promise.resolve([])
          : db.query.gear.findMany({
              where: inArray(gear.id, gearIds),
              with: { machineSettings: true, basketDetails: true },
            }),
      ])
    if (!bean || !brewingMethod) {
      throw new ShotRecommendationError(
        'The bean or brewing method is no longer available.',
      )
    }

    const gearById = new Map(selectedGear.map((item) => [item.id, item]))
    const gearEvidence = (id: number | null) => {
      if (id === null) return null
      const item = gearById.get(id)
      if (!item) return { id, unavailable: true }
      return {
        id: item.id,
        name: item.name,
        brand: item.brand,
        model: item.model,
        type: item.type,
        notes: item.notes,
        machineSettings: item.machineSettings,
        basketDetails: item.basketDetails,
      }
    }

    const context: ShotRecommendationContext = {
      bean: {
        id: bean.id,
        name: bean.name,
        roaster: bean.roasterRef?.name ?? bean.roaster,
        type: bean.type,
        origin: bean.origin,
        region: bean.region,
        farm: bean.farm,
        variety: bean.variety,
        process: bean.process,
        roastLevel: bean.roastLevel,
        roastDate: bean.roastDate,
        notes: bean.notes,
      },
      brewingMethod: {
        id: brewingMethod.id,
        name: brewingMethod.name,
        description: brewingMethod.description,
      },
      exactGear: {
        machineOrBrewer: gearEvidence(setup.machineId),
        grinder: gearEvidence(setup.grinderId),
        basket: gearEvidence(setup.basketId),
        accessories: setup.accessoryGearIds.map(gearEvidence),
      },
      enabledParameters: brewingMethod.enabledParameters,
      matchingShotCount: matchingShots.length,
      historyIncluded: matchingHistory.length,
      historyTruncated: matchingShots.length > matchingHistory.length,
      shotsOldestToNewest: matchingHistory.map((shot) => {
        const accessoryGearIds = shot.accessoryGearLinks.map(
          (link) => link.gearId,
        )
        return {
          id: shot.id,
          createdAt: shot.createdAt,
          parameters: shotParameters(
            shot,
            accessoryGearIds,
            brewingMethod.enabledParameters,
          ),
          achievedRatio: achievedRatio(shot),
          overallRating: shot.rating,
          sensory: {
            acidity: shot.acidity,
            sweetness: shot.sweetness,
            bitterness: shot.bitterness,
            body: shot.body,
            astringency: shot.astringency,
          },
          flavorTags: shot.tasteTags.map(({ tasteTag }) => ({
            name: tasteTag.name,
            category: tasteTag.category,
            extractionAxis: tasteTag.extractionAxis,
            strengthAxis: tasteTag.strengthAxis,
            compassHint: tasteTag.hint,
          })),
          tastingNotes: shot.notes,
        }
      }),
    }

    const recommendation = await withResourceLimits('shot-recommendation', () =>
      recommendShotFromHistory(context),
    )
    const gearNames = [
      gearById.get(setup.machineId ?? -1)?.name,
      gearById.get(setup.grinderId ?? -1)?.name,
      gearById.get(setup.basketId ?? -1)?.name,
      ...setup.accessoryGearIds.map((id) => gearById.get(id)?.name),
    ].filter((name): name is string => Boolean(name))
    const latestShot = matchingHistory.at(-1)

    return {
      recommendation,
      basis: {
        beanName: bean.name,
        brewingMethodName: brewingMethod.name,
        gearNames,
        matchingShotCount: matchingShots.length,
        historyIncluded: matchingHistory.length,
        historyTruncated: matchingShots.length > matchingHistory.length,
        latestShotAt: latestShot?.createdAt ?? null,
      },
    }
  })
