import { describe, expect, test } from 'bun:test'
import { TASTE_TAGS } from './taste-tags'

describe('default taste tags', () => {
  test('stores flavor-wheel context as an AI hint', () => {
    expect(
      TASTE_TAGS.every((tag) => tag.hint.startsWith('Flavor wheel:')),
    ).toBe(true)
  })

  test('does not duplicate the dedicated sensory ratings', () => {
    const names = new Set(TASTE_TAGS.map((tag) => tag.name.toLowerCase()))
    for (const coveredRating of [
      'bitter',
      'bitterness',
      'sour',
      'acidity',
      'sweetness',
      'body',
      'astringent',
      'astringency',
      'dryness',
      'thin',
      'full',
    ]) {
      expect(names.has(coveredRating)).toBe(false)
    }
  })
})
