import type { ShotFormValues } from '@/components/shots/shot-parameter-fields'
import { localDateTimeInputToDate } from '@/lib/date-input'
import { toNullableRating } from '@/lib/rating'
import {
  SHOT_RECOMMENDATION_PARAMETER_KEYS,
  type ShotRecommendationRequest,
} from '@/lib/shot-recommendation'
import { shotSensoryPayload } from '@/lib/shot-sensory'

export function shotParameterPayload(values: ShotFormValues) {
  return {
    brewingMethodId: Number(values.brewingMethodId),
    beanId: values.beanId ? Number(values.beanId) : null,
    machineId: values.machineId ? Number(values.machineId) : null,
    doseGrams: values.doseGrams || null,
    brewWaterGrams: values.brewWaterGrams || null,
    ratioBasis: values.ratioBasis || null,
    grinderId: values.grinderId ? Number(values.grinderId) : null,
    grindSetting: values.grindSetting || null,
    yieldGrams: values.yieldGrams || null,
    shotTimeSeconds: values.shotTimeSeconds || null,
    targetTimeSeconds: values.targetTimeSeconds || null,
    brewTemperatureCelsius: values.brewTemperatureCelsius || null,
    preinfusionTimeSeconds: values.preinfusionTimeSeconds || null,
    preinfusionPressureBar: values.preinfusionPressureBar || null,
    bloomTimeSeconds: values.bloomTimeSeconds || null,
    brewPressureBar: values.brewPressureBar || null,
    flowRateMlPerSecond: values.flowRateMlPerSecond || null,
    basketId: values.basketId ? Number(values.basketId) : null,
    usesPuckScreen: values.usesPuckScreen,
    paperFilterPosition: values.paperFilterPosition || null,
    distributionMethod: values.distributionMethod || null,
    tampForceKg: values.tampForceKg || null,
    accessoryGearIds: values.accessoryGearIds,
  }
}

export function shotDrinkPayload(values: ShotFormValues) {
  return {
    drinkTypeId: values.drinkTypeId ? Number(values.drinkTypeId) : null,
    drinkOptionValueIds: Object.values(values.drinkOptionValueIds)
      .filter(Boolean)
      .map(Number),
  }
}

export function newShotPayload(
  values: ShotFormValues,
  tasteTagIds: readonly number[],
  options?: { readonly brewedAt?: string },
) {
  const brewedAt = options?.brewedAt
    ? localDateTimeInputToDate(options.brewedAt)
    : null
  return {
    ...shotParameterPayload(values),
    ...shotDrinkPayload(values),
    brewedAt: brewedAt ?? undefined,
    rating: toNullableRating(values.rating),
    extractionBalance: toNullableRating(values.extractionBalance),
    ...shotSensoryPayload(values),
    notes: values.notes || null,
    tasteTagIds,
  }
}

export function newShotRecommendationRequest(
  values: ShotFormValues,
  enabledParameters: readonly string[],
): ShotRecommendationRequest | null {
  if (!values.beanId || !values.brewingMethodId) return null

  const enabledParameterKeys = new Set(enabledParameters)
  return {
    beanId: Number(values.beanId),
    brewingMethodId: Number(values.brewingMethodId),
    currentDraft: {
      machineId:
        enabledParameterKeys.has('machineId') && values.machineId
          ? Number(values.machineId)
          : null,
      grinderId:
        enabledParameterKeys.has('grinderId') && values.grinderId
          ? Number(values.grinderId)
          : null,
      basketId:
        enabledParameterKeys.has('basketId') && values.basketId
          ? Number(values.basketId)
          : null,
      accessoryGearIds: enabledParameterKeys.has('accessoryGearIds')
        ? values.accessoryGearIds
        : [],
      parameters: Object.fromEntries(
        SHOT_RECOMMENDATION_PARAMETER_KEYS.filter((key) =>
          enabledParameterKeys.has(key),
        ).flatMap((key) => {
          const value = values[key]
          return value === '' || value === null ? [] : [[key, value]]
        }),
      ),
    },
  }
}
