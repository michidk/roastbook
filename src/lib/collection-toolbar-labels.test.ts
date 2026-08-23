import { describe, expect, test } from 'bun:test'
import {
  activeFilterCount,
  collectionSearchPlaceholder,
} from '@/lib/collection-toolbar-labels'

describe('collection search placeholder', () => {
  test('carries the result count when one is available', () => {
    expect(collectionSearchPlaceholder('Search brews…', '186 brews')).toBe(
      'Search 186 brews…',
    )
  })

  test('keeps the given placeholder without a result count', () => {
    expect(collectionSearchPlaceholder('Search brews…')).toBe('Search brews…')
    expect(collectionSearchPlaceholder('Search brews…', '   ')).toBe(
      'Search brews…',
    )
  })

  test('keeps a scoped count intact', () => {
    expect(
      collectionSearchPlaceholder('Search brews…', '12 brews · Diego Robelo'),
    ).toBe('Search 12 brews · Diego Robelo…')
  })
})

describe('active filter count', () => {
  test('counts only chosen values', () => {
    expect(activeFilterCount([undefined, null, ''])).toBe(0)
    expect(activeFilterCount(['3', undefined])).toBe(1)
    expect(activeFilterCount(['3', 4])).toBe(2)
  })

  test('counts a zero rating as a chosen value', () => {
    expect(activeFilterCount(['0'])).toBe(1)
    expect(activeFilterCount([0])).toBe(1)
  })
})
