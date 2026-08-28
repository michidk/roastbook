import type {
  basketDetails,
  beans,
  gear,
  machineSettings,
  recipes,
  roasters,
  shots,
  tasteTags,
} from '@/db/schema'
import { extractionBalanceLabel } from '@/lib/extraction-balance'
import {
  isShotParameterKey,
  type ShotParameterKey,
} from '@/lib/shot-parameters'

type BeanEvidenceSource = Pick<
  typeof beans.$inferSelect,
  | 'id'
  | 'name'
  | 'roaster'
  | 'type'
  | 'origin'
  | 'region'
  | 'farm'
  | 'variety'
  | 'process'
  | 'roastLevel'
  | 'roastDate'
  | 'notes'
> & {
  readonly roasterRef: Pick<typeof roasters.$inferSelect, 'name'> | null
}

type GearEvidenceSource = Pick<
  typeof gear.$inferSelect,
  'id' | 'name' | 'brand' | 'model' | 'type' | 'notes'
> & {
  readonly machineSettings: typeof machineSettings.$inferSelect | null
  readonly basketDetails: typeof basketDetails.$inferSelect | null
}

type ShotEvidenceSource = typeof shots.$inferSelect & {
  readonly recipe: Pick<typeof recipes.$inferSelect, 'id' | 'name'> | null
  readonly accessoryGearLinks: readonly { readonly gearId: number }[]
  readonly tasteTags: readonly {
    readonly tasteTag: Pick<
      typeof tasteTags.$inferSelect,
      'name' | 'category' | 'extractionAxis' | 'strengthAxis' | 'hint'
    >
  }[]
}

/** Keep the requested brew in bounded history even when it is older. */
export function recommendationHistoryIds(
  matchingShotsNewestFirst: readonly { readonly id: number }[],
  focusedShotId: number | null,
  limit: number,
) {
  const recentIds = matchingShotsNewestFirst
    .slice(0, limit)
    .map((shot) => shot.id)
  if (focusedShotId === null || recentIds.includes(focusedShotId)) {
    return recentIds
  }
  if (recentIds.length < limit) return [...recentIds, focusedShotId]

  return [...recentIds.slice(0, Math.max(0, limit - 1)), focusedShotId]
}

/** Brewing-relevant bean context shared by every recommendation mode. */
export function recommendationBeanEvidence(bean: BeanEvidenceSource) {
  return {
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
  }
}

/** Exact equipment details, including subtype data that can affect extraction. */
export function recommendationGearEvidence(
  id: number,
  item: GearEvidenceSource | undefined,
) {
  if (!item) return { id, unavailable: true as const }

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

/** Complete outcome evidence for one logged brew, used for history and focus. */
export function recommendationShotEvidence(
  shot: ShotEvidenceSource,
  enabledParameters: readonly string[],
) {
  const accessoryGearIds = shot.accessoryGearLinks.map((link) => link.gearId)

  return {
    id: shot.id,
    brewedAt: shot.brewedAt,
    recipe: shot.recipe ? { id: shot.recipe.id, name: shot.recipe.name } : null,
    parameters: shotParameters(shot, accessoryGearIds, enabledParameters),
    achievedRatio: achievedRatio(shot),
    overallRating: shot.rating,
    // Simple mode records only this axis; sour reads as under-extracted and
    // bitter as over-extracted.
    sourToBitterBalance: extractionBalanceLabel(shot.extractionBalance),
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
}
