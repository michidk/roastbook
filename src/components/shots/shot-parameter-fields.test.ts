import { describe, expect, test } from 'bun:test'
import { DISTRIBUTION_METHOD_OPTIONS } from '@/lib/shot-parameters'
import {
  EMPTY_SHOT_FORM_VALUES,
  gearByEquipmentRole,
  shotFormValuesFrom,
  shotFormValuesWithGearSet,
  shotFormValuesWithRecipe,
} from '@/modules/brews/shot-form-values'

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
    targetTimeSeconds: null,
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
  test('defaults paper filters and puck screens to no', () => {
    expect(EMPTY_SHOT_FORM_VALUES).toMatchObject({
      paperFilterPosition: 'none',
      usesPuckScreen: false,
    })
  })

  test('offers machines with built-in grinders in both equipment selectors', () => {
    const machineWithGrinder = {
      id: 2,
      name: 'Barista Express',
      type: 'espresso_machine_with_grinder',
    }
    const roles = gearByEquipmentRole([
      { id: 1, name: 'Linea Mini', type: 'espresso_machine' },
      machineWithGrinder,
      { id: 3, name: 'Niche Zero', type: 'grinder' },
    ])

    expect(roles.brewers).toContainEqual(machineWithGrinder)
    expect(roles.grinders).toContainEqual(machineWithGrinder)
  })

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
      drinkTypeId: 6,
      doseGrams: '18',
      usesPuckScreen: false,
    }

    expect(shotFormValuesWithRecipe(current, recipe)).toEqual({
      ...current,
      brewingMethodId: '2',
      drinkTypeId: '6',
      doseGrams: '18',
      usesPuckScreen: false,
    })
  })

  test('applies only populated gear set slots to an existing shot', () => {
    const current = {
      ...EMPTY_SHOT_FORM_VALUES,
      machineId: '4',
      grinderId: '3',
      accessoryGearIds: [11],
      doseGrams: '18',
    }
    const gearSet = {
      machineId: 7,
      grinderId: null,
      basketId: 9,
      accessoryGearIds: [],
    }

    expect(shotFormValuesWithGearSet(current, gearSet)).toEqual({
      ...current,
      machineId: '7',
      basketId: '9',
    })
  })

  test('replaces accessories when the gear set defines some', () => {
    const current = { ...EMPTY_SHOT_FORM_VALUES, accessoryGearIds: [11] }
    const gearSet = {
      machineId: null,
      grinderId: null,
      basketId: null,
      accessoryGearIds: [5, 6],
    }

    expect(
      shotFormValuesWithGearSet(current, gearSet).accessoryGearIds,
    ).toEqual([5, 6])
  })
})
