import { describe, expect, test } from 'bun:test'
import {
  EMPTY_SHOT_FORM_VALUES,
  shotFormValuesFrom,
  shotFormValuesWithRecipe,
} from '@/components/shots/shot-parameter-fields'
import { DISTRIBUTION_METHOD_OPTIONS } from '@/lib/shot-parameters'

function shotParameters(
  distributionMethod: string | null,
): Parameters<typeof shotFormValuesFrom>[0] {
  return {
    brewingMethodId: 1,
    beanId: null,
    machineId: null,
    doseGrams: null,
    brewWaterGrams: null,
    ratioBasis: null,
    grinderId: null,
    grindSetting: null,
    yieldGrams: null,
    shotTimeSeconds: null,
    brewTemperatureCelsius: null,
    preinfusionTimeSeconds: null,
    preinfusionPressureBar: null,
    bloomTimeSeconds: null,
    brewPressureBar: null,
    flowRateMlPerSecond: null,
    basketId: null,
    usesPuckScreen: null,
    paperFilterPosition: null,
    distributionMethod,
    tampForceKg: null,
    accessoryGearIds: [],
  }
}

describe('shot form values', () => {
  test('offers only the supported distribution methods', () => {
    expect(DISTRIBUTION_METHOD_OPTIONS).toEqual([
      { value: 'WDT', label: 'WDT' },
      { value: 'Blind shaker', label: 'Blind shaker' },
      { value: 'Distribution tool', label: 'Distribution tool' },
      { value: 'Stockfleth move', label: 'Stockfleth move' },
    ])
  })

  test('keeps supported distribution methods', () => {
    expect(
      shotFormValuesFrom(shotParameters('Blind shaker')).distributionMethod,
    ).toBe('Blind shaker')
  })

  test('drops legacy distribution methods', () => {
    expect(
      shotFormValuesFrom(shotParameters('Finger distribution'))
        .distributionMethod,
    ).toBe('')
  })

  test('applies only populated recipe values to an existing shot', () => {
    const current = {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId: '1',
      beanId: '8',
      grinderId: '3',
      grindSetting: '22',
      preinfusionPressureBar: '2',
      usesPuckScreen: true,
      accessoryGearIds: [11],
      rating: 4,
      notes: 'Keep this tasting note',
    }
    const recipe = {
      ...shotParameters(null),
      brewingMethodId: 2,
      doseGrams: '18',
      usesPuckScreen: false,
    }

    expect(shotFormValuesWithRecipe(current, recipe)).toEqual({
      ...current,
      brewingMethodId: '2',
      doseGrams: '18',
      usesPuckScreen: false,
    })
  })
})
