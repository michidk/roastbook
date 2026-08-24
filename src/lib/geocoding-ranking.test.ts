import { describe, expect, test } from 'bun:test'
import { prioritizeCoffeeShopCandidates } from '@/lib/geocoding-ranking'

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
})
