import { describe, expect, test } from 'bun:test'
import {
  assertValidUpdate,
  getCafeVisitUpdateErrors,
  getShotUpdateErrors,
} from '@/lib/update-validation'

describe('update validation', () => {
  test('reports invalid shot fields and throws the first displayable error', () => {
    const errors = getShotUpdateErrors({
      id: 1,
      brewingMethodId: 0,
      doseGrams: '-1',
      brewTemperatureCelsius: '93.25',
      rating: 6,
    })

    expect(errors).toEqual({
      brewingMethodId: 'Choose a brewing method',
      doseGrams: 'Dose must be between 0 and 999.99',
      brewTemperatureCelsius:
        'Water temperature must have at most 1 decimal places',
      rating: 'Rating must be between 1 and 5',
    })
    expect(() => assertValidUpdate(errors)).toThrow('Choose a brewing method')
  })

  test('validates visit decimal, currency, and rating updates', () => {
    expect(
      getCafeVisitUpdateErrors({
        id: 1,
        price: '3.50',
        currency: 'EUR',
        rating: 5,
      }),
    ).toEqual({})
    expect(
      getCafeVisitUpdateErrors({
        id: 1,
        price: 'free',
        currency: 'BTC',
        rating: 0,
      }),
    ).toEqual({
      price: 'Price must be a number',
      currency: 'Choose a supported currency',
      rating: 'Rating must be between 1 and 5',
    })
  })
})

describe('update validation contracts', () => {
  test('uses the server pressure limit and precision', () => {
    expect(
      getShotUpdateErrors({
        id: 1,
        brewingMethodId: 1,
        brewPressureBar: '99.99',
      }),
    ).toEqual({})
    expect(
      getShotUpdateErrors({
        id: 1,
        brewingMethodId: 1,
        brewPressureBar: '100',
      }),
    ).toHaveProperty('brewPressureBar')
  })

  test('accepts every domain currency and nullable cleared fields', () => {
    for (const currency of ['EUR', 'USD', 'GBP', 'CHF'] as const) {
      expect(getCafeVisitUpdateErrors({ id: 1, currency })).toEqual({})
    }
    expect(
      getCafeVisitUpdateErrors({ id: 1, currency: null, price: null }),
    ).toEqual({})
  })

  test('reports future brew and visit dates inline', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000)
    expect(
      getShotUpdateErrors({
        id: 1,
        brewingMethodId: 1,
        brewedAt: future,
      }),
    ).toHaveProperty('brewedAt')
    expect(
      getCafeVisitUpdateErrors({ id: 1, visitedAt: future }),
    ).toHaveProperty('visitedAt')
  })

  test('validates each sensory intensity independently', () => {
    expect(
      getShotUpdateErrors({
        id: 1,
        brewingMethodId: 1,
        bitterness: 1,
        acidity: 5,
        sweetness: null,
      }),
    ).toEqual({})
    expect(
      getShotUpdateErrors({
        id: 1,
        brewingMethodId: 1,
        body: 6,
        astringency: 0,
      }),
    ).toEqual({
      body: 'Body must be between 1 and 5',
      astringency: 'Astringency must be between 1 and 5',
    })
  })
})
