import type { ShotFormValues } from '@/components/shots/shot-parameter-fields'
import { localDateTimeInputToDate } from '@/lib/date-input'
import { toNullableRating } from '@/lib/rating'

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

export function sensoryRatingPayload(values: ShotFormValues) {
  return {
    bitterness: values.bitterness || null,
    acidity: values.acidity || null,
    sweetness: values.sweetness || null,
    body: values.body || null,
    astringency: values.astringency || null,
  }
}

export function newShotPayload(
  values: ShotFormValues,
  tasteTagIds: readonly number[],
  options?: { readonly brewedAt?: string; readonly recipeId?: string },
) {
  const brewedAt = options?.brewedAt
    ? localDateTimeInputToDate(options.brewedAt)
    : null
  return {
    ...shotParameterPayload(values),
    brewedAt: brewedAt ?? undefined,
    recipeId: options?.recipeId ? Number(options.recipeId) : null,
    rating: toNullableRating(values.rating),
    ...sensoryRatingPayload(values),
    notes: values.notes || null,
    tasteTagIds,
  }
}
