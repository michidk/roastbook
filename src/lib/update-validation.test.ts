import { describe, expect, test } from 'bun:test'
import {
  getCafeVisitUpdateErrors,
  getShotUpdateErrors,
} from '@/lib/update-validation'

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
})
