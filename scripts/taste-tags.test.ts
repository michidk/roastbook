import { describe, expect, test } from 'bun:test'
import { LEGACY_SENSORY_TASTE_TAG_NAMES } from '../src/lib/taste-tags'
import { TASTE_TAGS } from './taste-tags'

describe('default taste tags', () => {
  test('stores flavor-wheel or Espresso Compass context as an AI hint', () => {
    expect(TASTE_TAGS.every((tag) => tag.hint.length > 0)).toBe(true)
    expect(TASTE_TAGS.find((tag) => tag.name === 'Berry')?.hint).toStartWith(
      'Flavor wheel:',
    )
    expect(TASTE_TAGS.find((tag) => tag.name === 'Empty')?.hint).toStartWith(
      'Espresso Compass:',
    )
  })

  test('preserves the Compass descriptor catalog and chart positions', () => {
    expect(TASTE_TAGS.find((tag) => tag.name === 'Overwhelming')).toMatchObject(
      {
        extractionAxis: '-0.90',
        strengthAxis: '0.70',
      },
    )
    expect(TASTE_TAGS.find((tag) => tag.name === 'Balanced')).toMatchObject({
      extractionAxis: '0.00',
      strengthAxis: '0.40',
    })
    expect(TASTE_TAGS.find((tag) => tag.name === 'Powdery')).toMatchObject({
      extractionAxis: '0.55',
      strengthAxis: '-0.55',
    })
  })

  test('does not duplicate the dedicated sensory ratings', () => {
    const names = new Set(TASTE_TAGS.map((tag) => tag.name.toLowerCase()))
    for (const legacyName of LEGACY_SENSORY_TASTE_TAG_NAMES) {
      expect(names.has(legacyName.toLowerCase())).toBe(false)
    }
  })
})
