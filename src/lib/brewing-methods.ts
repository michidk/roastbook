import {
  isShotParameterKey,
  SHOT_PARAMETER_KEYS,
  type ShotParameterKey,
} from '@/lib/shot-parameters'

type DefaultBrewingMethod = {
  readonly name: string
  readonly description: string
  readonly enabledParameters: readonly ShotParameterKey[]
  readonly timerEnabled: boolean
}

export const DEFAULT_BREWING_METHODS = [
  {
    name: 'Espresso',
    description: 'Concentrated coffee brewed under pressure.',
    timerEnabled: true,
    enabledParameters: [
      'machineId',
      'doseGrams',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'brewTemperatureCelsius',
      'preinfusionTimeSeconds',
      'preinfusionPressureBar',
      'brewPressureBar',
      'basketId',
      'usesPuckScreen',
      'paperFilterPosition',
      'distributionMethod',
      'tampForceKg',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Pour over',
    description: 'Filter coffee brewed by pouring water over the grounds.',
    timerEnabled: true,
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'brewTemperatureCelsius',
      'bloomTimeSeconds',
      'flowRateMlPerSecond',
      'accessoryGearIds',
    ],
  },
  {
    name: 'AeroPress',
    description: 'Immersion brewing finished with gentle manual pressure.',
    timerEnabled: true,
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'brewTemperatureCelsius',
      'bloomTimeSeconds',
      'paperFilterPosition',
      'accessoryGearIds',
    ],
  },
  {
    name: 'French press',
    description: 'Full-immersion coffee separated with a mesh plunger.',
    timerEnabled: true,
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'brewTemperatureCelsius',
      'bloomTimeSeconds',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Moka pot',
    description:
      'Stovetop coffee brewed as steam pressure pushes water upward.',
    timerEnabled: true,
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'brewTemperatureCelsius',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Cold brew',
    description: 'Coffee extracted slowly with cool water.',
    timerEnabled: true,
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Other',
    description: 'A flexible method for custom brewing workflows.',
    timerEnabled: false,
    enabledParameters: SHOT_PARAMETER_KEYS,
  },
] as const satisfies readonly DefaultBrewingMethod[]

export function normalizeShotParameterKeys(
  values: readonly string[],
): readonly ShotParameterKey[] {
  return SHOT_PARAMETER_KEYS.filter((key) =>
    values.some((value) => value === key),
  )
}

export function hasOnlyShotParameterKeys(values: readonly string[]): boolean {
  return values.every(isShotParameterKey)
}
