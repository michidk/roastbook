import {
  isShotParameterKey,
  SHOT_PARAMETER_KEYS,
  type ShotParameterKey,
} from '@/lib/shot-parameters'

type DefaultBrewingMethod = {
  readonly name: string
  readonly brewMethodId: string | null
  readonly description: string
  readonly enabledParameters: readonly ShotParameterKey[]
  readonly timerEnabled: boolean
  readonly drinkTypeNames: readonly string[]
}

export const DEFAULT_BREWING_METHODS = [
  {
    name: 'Espresso',
    brewMethodId: 'espresso',
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
      'basketId',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Pour over',
    brewMethodId: 'pour-over',
    description: 'Filter coffee brewed by pouring water over the grounds.',
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
      'bloomWaterGrams',
      'pourCount',
      'accessoryGearIds',
    ],
  },
  {
    name: 'AeroPress',
    brewMethodId: 'aeropress',
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
      'steepTimeSeconds',
      'brewTemperatureCelsius',
      'accessoryGearIds',
    ],
  },
  {
    name: 'French press',
    brewMethodId: 'french-press',
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
      'steepTimeSeconds',
      'brewTemperatureCelsius',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Moka pot',
    brewMethodId: 'moka-pot',
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
    brewMethodId: 'cold-brew',
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
      'steepTimeSeconds',
      'accessoryGearIds',
    ],
  },
  {
    name: 'Other',
    brewMethodId: null,
    description: 'A flexible method for custom brewing workflows.',
    timerEnabled: true,
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
