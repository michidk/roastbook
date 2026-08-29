import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_TASTE_PROFILE_CONFIG,
  DEFAULT_TASTE_PROFILE_FIELDS,
  enabledSensoryRatingKeys,
  enabledTasteProfileFields,
  hasEnabledTasteProfileField,
  isTasteProfileField,
  TASTE_PROFILE_SCALE_FIELDS,
  tasteProfileConfigFrom,
} from '@/lib/taste-profile'

describe('tasteProfileConfigFrom', () => {
  test('enables exactly the stored fields', () => {
    const config = tasteProfileConfigFrom(['overallRating', 'notes'])
    expect(config.overallRating).toBe(true)
    expect(config.notes).toBe(true)
    expect(config.flavorTags).toBe(false)
    expect(config.bitterness).toBe(false)
  })

  test('ignores unknown field names', () => {
    expect(tasteProfileConfigFrom(['crema', 'notes'])).toEqual(
      tasteProfileConfigFrom(['notes']),
    )
  })

  test('round-trips through enabledTasteProfileFields', () => {
    const fields = ['acidity', 'flavorTags', 'overallRating'] as const
    expect(enabledTasteProfileFields(tasteProfileConfigFrom(fields))).toEqual([
      'overallRating',
      'acidity',
      'flavorTags',
    ])
  })

  test('treats an empty list as everything disabled', () => {
    const config = tasteProfileConfigFrom([])
    expect(hasEnabledTasteProfileField(config)).toBe(false)
    expect(enabledTasteProfileFields(config)).toEqual([])
  })
})

describe('DEFAULT_TASTE_PROFILE_CONFIG', () => {
  test('matches the database default', () => {
    expect(DEFAULT_TASTE_PROFILE_CONFIG).toEqual(
      tasteProfileConfigFrom(DEFAULT_TASTE_PROFILE_FIELDS),
    )
    expect(hasEnabledTasteProfileField(DEFAULT_TASTE_PROFILE_CONFIG)).toBe(true)
  })

  test('starts with the individual factors and the balance axis off', () => {
    expect(DEFAULT_TASTE_PROFILE_CONFIG.extractionBalance).toBe(false)
    expect(DEFAULT_TASTE_PROFILE_FIELDS).not.toContain('extractionBalance')
    expect(enabledSensoryRatingKeys(DEFAULT_TASTE_PROFILE_CONFIG)).toEqual([
      'bitterness',
      'acidity',
      'sweetness',
      'body',
      'astringency',
    ])
  })
})

describe('TASTE_PROFILE_SCALE_FIELDS', () => {
  test('offers every scale and no free-text field', () => {
    expect([...TASTE_PROFILE_SCALE_FIELDS]).toEqual([
      'overallRating',
      'extractionBalance',
      'bitterness',
      'acidity',
      'sweetness',
      'body',
      'astringency',
    ])
  })

  test('lets the balance axis and the individual factors run together', () => {
    const config = tasteProfileConfigFrom(['extractionBalance', 'bitterness'])
    expect(config.extractionBalance).toBe(true)
    expect(enabledSensoryRatingKeys(config)).toEqual(['bitterness'])
  })
})

describe('enabledSensoryRatingKeys', () => {
  test('keeps the canonical order and drops disabled factors', () => {
    const config = tasteProfileConfigFrom([
      'body',
      'bitterness',
      'overallRating',
    ])
    expect(enabledSensoryRatingKeys(config)).toEqual(['bitterness', 'body'])
  })

  test('excludes non-sensory fields', () => {
    const config = tasteProfileConfigFrom(['overallRating', 'flavorTags'])
    expect(enabledSensoryRatingKeys(config)).toEqual([])
  })
})

describe('isTasteProfileField', () => {
  test('accepts known fields and rejects anything else', () => {
    expect(isTasteProfileField('astringency')).toBe(true)
    expect(isTasteProfileField('overallRating')).toBe(true)
    expect(isTasteProfileField('rating')).toBe(false)
    expect(isTasteProfileField(undefined)).toBe(false)
  })
})
