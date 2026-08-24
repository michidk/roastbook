import { describe, expect, test } from 'bun:test'
import { normalizeRatingAverages, toNullableNumber } from '@/lib/stats-number'

describe('ranking and stats helpers', () => {
  test('normalizes numeric database values', () => {
    expect(toNullableNumber('4.25')).toBe(4.25)
    expect(toNullableNumber('not-a-number')).toBeNull()
    expect(normalizeRatingAverages([{ name: 'A', avgRating: '4.50' }])).toEqual(
      [{ name: 'A', avgRating: 4.5 }],
    )
  })
})
