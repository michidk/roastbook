import type { ShotFormValues } from "@/components/shots/shot-parameter-fields"

export function newShotPayload(
  values: ShotFormValues,
  tasteTagIds: readonly number[],
) {
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
    rating: values.rating,
    notes: values.notes || null,
    tasteTagIds,
  }
}
