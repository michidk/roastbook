import { describe, expect, test } from 'bun:test'
import { newShotRecommendationRequest } from '@/lib/new-shot-payload'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'

describe('new brew recommendation request', () => {
  test('keeps enabled current values and excludes stale hidden values', () => {
    const values = {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId: '3',
      beanId: '12',
      machineId: '4',
      grinderId: '5',
      basketId: '6',
      doseGrams: '18',
      grindSetting: '2.5',
      brewTemperatureCelsius: '93',
      usesPuckScreen: false,
      accessoryGearIds: [8, 9],
    }

    expect(
      newShotRecommendationRequest(values, [
        'machineId',
        'grinderId',
        'doseGrams',
        'usesPuckScreen',
        'accessoryGearIds',
      ]),
    ).toEqual({
      beanId: 12,
      brewingMethodId: 3,
      currentDraft: {
        machineId: 4,
        grinderId: 5,
        basketId: null,
        accessoryGearIds: [8, 9],
        parameters: {
          doseGrams: '18',
          usesPuckScreen: false,
        },
      },
    })
  })

  test('requires a bean before building a recommendation request', () => {
    expect(
      newShotRecommendationRequest(
        { ...EMPTY_SHOT_FORM_VALUES, brewingMethodId: '3' },
        ['doseGrams'],
      ),
    ).toBeNull()
  })
})
