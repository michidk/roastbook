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
  readonly drinkTypeNames: readonly string[]
}

export const DEFAULT_BREWING_METHODS = [
  {
    name: 'Espresso',
    description: 'Concentrated coffee brewed under pressure.',
    timerEnabled: true,
    drinkTypeNames: [
      'Espresso',
      'Doppio',
      'Ristretto',
      'Lungo',
      'Americano',
      'Latte',
      'Cappuccino',
      'Flat White',
      'Cortado',
      'Macchiato',
      'Mocha',
      'Other',
    ],
    enabledParameters: [
      'machineId',
      'doseGrams',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'targetTimeSeconds',
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
    drinkTypeNames: ['Pour Over', 'Filter', 'Iced Coffee', 'Other'],
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'targetTimeSeconds',
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
    drinkTypeNames: ['Filter', 'Iced Coffee', 'Other'],
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'targetTimeSeconds',
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
    drinkTypeNames: ['Filter', 'Iced Coffee', 'Other'],
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'targetTimeSeconds',
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
    drinkTypeNames: [
      'Espresso',
      'Americano',
      'Latte',
      'Cappuccino',
      'Flat White',
      'Cortado',
      'Macchiato',
      'Mocha',
      'Other',
    ],
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'targetTimeSeconds',
      'brewTemperatureCelsius',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Cold brew',
    description: 'Coffee extracted slowly with cool water.',
    timerEnabled: true,
    drinkTypeNames: ['Cold Brew', 'Other'],
    enabledParameters: [
      'machineId',
      'doseGrams',
      'brewWaterGrams',
      'ratioBasis',
      'grinderId',
      'grindSetting',
      'yieldGrams',
      'shotTimeSeconds',
      'targetTimeSeconds',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Other',
    description: 'A flexible method for custom brewing workflows.',
    timerEnabled: false,
    drinkTypeNames: [],
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
