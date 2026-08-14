import { describe, expect, test } from 'bun:test'
import {
  hasShotSensoryRatings,
  shotSensoryPayload,
  shotSensoryRatingsFrom,
} from '@/lib/shot-sensory'

describe('shot sensory ratings', () => {
  test('normalizes missing database values for form controls', () => {
    expect(shotSensoryRatingsFrom({ sweetness: 4, body: null })).toEqual({
      bitterness: 0,
      acidity: 0,
      sweetness: 4,
      body: 0,
      astringency: 0,
    })
  })

  test('turns cleared form values into nullable database values', () => {
    expect(
      shotSensoryPayload({
        bitterness: 2,
        acidity: 0,
        sweetness: 5,
        body: 3,
        astringency: 0,
      }),
    ).toEqual({
      bitterness: 2,
      acidity: null,
      sweetness: 5,
      body: 3,
      astringency: null,
    })
  })

  test('detects whether a brew has a taste profile', () => {
    expect(hasShotSensoryRatings({ body: 2 })).toBe(true)
    expect(hasShotSensoryRatings({ body: null })).toBe(false)
  })
})
