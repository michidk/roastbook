import { describe, expect, test } from 'bun:test'
import { shotFormValuesFrom } from '@/components/shots/shot-parameter-fields'
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
})
