import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_TASTE_PROFILE_CONFIG,
  DEFAULT_TASTE_PROFILE_FIELDS,
  enabledSensoryRatingKeys,
  enabledTasteProfileFields,
  hasEnabledTasteProfileField,
  isTasteProfileField,
  tasteProfileConfigFrom,
  tasteProfileMode,
  withTasteProfileMode,
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

  test('starts in detailed mode with the balance axis off', () => {
    expect(tasteProfileMode(DEFAULT_TASTE_PROFILE_CONFIG)).toBe('detailed')
    expect(DEFAULT_TASTE_PROFILE_CONFIG.extractionBalance).toBe(false)
    expect(DEFAULT_TASTE_PROFILE_FIELDS).not.toContain('extractionBalance')
  })
})

describe('taste profile modes', () => {
  test('reports simple mode only when the balance axis is enabled', () => {
    expect(
      tasteProfileMode(tasteProfileConfigFrom(['extractionBalance'])),
    ).toBe('simple')
    expect(tasteProfileMode(tasteProfileConfigFrom(['bitterness']))).toBe(
      'detailed',
    )
    expect(tasteProfileMode(tasteProfileConfigFrom([]))).toBe('detailed')
  })

  test('switching to simple drops every sensory factor', () => {
    const simple = withTasteProfileMode(DEFAULT_TASTE_PROFILE_CONFIG, 'simple')
    expect(enabledSensoryRatingKeys(simple)).toEqual([])
    expect(simple.extractionBalance).toBe(true)
  })

  test('switching to detailed restores every sensory factor', () => {
    const simple = withTasteProfileMode(DEFAULT_TASTE_PROFILE_CONFIG, 'simple')
    const detailed = withTasteProfileMode(simple, 'detailed')
    expect(detailed).toEqual(DEFAULT_TASTE_PROFILE_CONFIG)
    expect(detailed.extractionBalance).toBe(false)
  })

  test('keeps the unrelated toggles across a mode switch', () => {
    const config = tasteProfileConfigFrom(['bitterness', 'notes'])
    const simple = withTasteProfileMode(config, 'simple')
    expect(simple.notes).toBe(true)
    expect(simple.overallRating).toBe(false)
    expect(simple.flavorTags).toBe(false)
  })

  test('is a no-op when the mode already matches', () => {
    const config = tasteProfileConfigFrom(['bitterness'])
    expect(withTasteProfileMode(config, 'detailed')).toBe(config)
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
