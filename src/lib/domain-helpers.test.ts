import { describe, expect, test } from 'bun:test'
import { prioritizeCoffeeShopCandidates } from '@/lib/geocoding-ranking'
import { getStoredImagePaths } from '@/lib/image-path'
import { projectShotParameters } from '@/lib/server/shot-parameter-projection'
import { fillDailyActivity } from '@/lib/stats-activity'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'
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

describe('shot parameter projection', () => {
  test('keeps enabled values, clears disabled values, and deduplicates gear', () => {
    const result = projectShotParameters(
      {
        machineId: 4,
        doseGrams: '18.00',
        yieldGrams: '36.00',
        usesPuckScreen: false,
        accessoryGearIds: [7, 7, 9],
      },
      ['doseGrams', 'usesPuckScreen', 'accessoryGearIds', 'unknown'],
    )

    expect(result.doseGrams).toBe('18.00')
    expect(result.machineId).toBeNull()
    expect(result.yieldGrams).toBeNull()
    expect(result.usesPuckScreen).toBe(false)
    expect(result.accessoryGearIds).toEqual([7, 9])
  })
})

describe('ranking and stats helpers', () => {
  test('prioritizes explicit coffee cuisine, coffee shops, and cafes', () => {
    const candidates = [
      { id: 'other', category: 'tourism', type: 'museum' },
      { id: 'cafe', category: 'amenity', type: 'cafe' },
      { id: 'shop', category: 'shop', type: 'coffee' },
      {
        id: 'cuisine',
        category: 'amenity',
        type: 'restaurant',
        extratags: { cuisine: 'breakfast; coffee_shop' },
      },
    ]

    expect(
      prioritizeCoffeeShopCandidates(candidates, 3).map(({ id }) => id),
    ).toEqual(['cuisine', 'shop', 'cafe'])
  })

  test('normalizes numeric database values and fills a 30-day activity window', () => {
    expect(toNullableNumber('4.25')).toBe(4.25)
    expect(toNullableNumber('not-a-number')).toBeNull()
    expect(normalizeRatingAverages([{ name: 'A', avgRating: '4.50' }])).toEqual(
      [{ name: 'A', avgRating: 4.5 }],
    )

    const activity = fillDailyActivity(
      [{ date: '2026-01-15', count: 3 }],
      new Date(2026, 0, 15, 12),
    )
    expect(activity).toHaveLength(30)
    expect(activity.at(-1)).toEqual({ date: '2026-01-15', count: 3 })
    expect(activity.filter(({ count }) => count > 0)).toHaveLength(1)
  })
})

describe('media lifecycle paths', () => {
  test('pairs every original with the thumbnail cleanup target', () => {
    expect(
      getStoredImagePaths(['beans/1/front.jpg', 'beans/1/back.png']),
    ).toEqual([
      'beans/1/front.jpg',
      'beans/1/front.thumb.webp',
      'beans/1/back.png',
      'beans/1/back.thumb.webp',
    ])
  })
})
