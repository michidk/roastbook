import { describe, expect, test } from 'bun:test'
import { newShotRecommendationRequest } from '@/lib/new-shot-payload'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'

describe('new brew recommendation request', () => {
  test('uses only the selected bean', () => {
    const values = {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId: '',
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

    expect(newShotRecommendationRequest(values)).toEqual({
      beanId: 12,
    })
  })

  test('requires a bean before building a recommendation request', () => {
    expect(
      newShotRecommendationRequest({
        ...EMPTY_SHOT_FORM_VALUES,
        brewingMethodId: '3',
      }),
    ).toBeNull()
  })
})
