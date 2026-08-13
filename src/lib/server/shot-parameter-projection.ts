import { normalizeShotParameterKeys } from "@/lib/brewing-methods"
import type { ShotParameterInput } from "@/lib/shot-parameters"

export function projectShotParameters(
  data: ShotParameterInput,
  enabledParameters: readonly string[],
) {
  const enabled = new Set(normalizeShotParameterKeys(enabledParameters))
  return {
    machineId: enabled.has("machineId") ? data.machineId ?? null : null,
    doseGrams: enabled.has("doseGrams") ? data.doseGrams ?? null : null,
    brewWaterGrams: enabled.has("brewWaterGrams")
      ? data.brewWaterGrams ?? null
      : null,
    ratioBasis: enabled.has("ratioBasis") ? data.ratioBasis ?? null : null,
    grinderId: enabled.has("grinderId") ? data.grinderId ?? null : null,
    grindSetting: enabled.has("grindSetting") ? data.grindSetting ?? null : null,
    yieldGrams: enabled.has("yieldGrams") ? data.yieldGrams ?? null : null,
    shotTimeSeconds: enabled.has("shotTimeSeconds")
      ? data.shotTimeSeconds ?? null
      : null,
    brewTemperatureCelsius: enabled.has("brewTemperatureCelsius")
      ? data.brewTemperatureCelsius ?? null
      : null,
    preinfusionTimeSeconds: enabled.has("preinfusionTimeSeconds")
      ? data.preinfusionTimeSeconds ?? null
      : null,
    preinfusionPressureBar: enabled.has("preinfusionPressureBar")
      ? data.preinfusionPressureBar ?? null
      : null,
    bloomTimeSeconds: enabled.has("bloomTimeSeconds")
      ? data.bloomTimeSeconds ?? null
      : null,
    brewPressureBar: enabled.has("brewPressureBar")
      ? data.brewPressureBar ?? null
      : null,
    flowRateMlPerSecond: enabled.has("flowRateMlPerSecond")
      ? data.flowRateMlPerSecond ?? null
      : null,
    basketId: enabled.has("basketId") ? data.basketId ?? null : null,
    usesPuckScreen: enabled.has("usesPuckScreen")
      ? data.usesPuckScreen ?? null
      : null,
    paperFilterPosition: enabled.has("paperFilterPosition")
      ? data.paperFilterPosition ?? null
      : null,
    distributionMethod: enabled.has("distributionMethod")
      ? data.distributionMethod ?? null
      : null,
    tampForceKg: enabled.has("tampForceKg") ? data.tampForceKg ?? null : null,
    accessoryGearIds: enabled.has("accessoryGearIds")
      ? [...new Set(data.accessoryGearIds ?? [])]
      : [],
  }
}
