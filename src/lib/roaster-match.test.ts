import { describe, expect, test } from 'bun:test'
import {
  findRoasterByName,
  getExtractedRoasterAction,
} from '@/lib/roaster-match'

const roasters = [
  { id: 1, name: 'Five Ways Coffee Roasters' },
  { id: 2, name: 'Onyx Coffee Lab' },
]

describe('findRoasterByName', () => {
  test('matches names without caring about case or whitespace', () => {
    expect(findRoasterByName(roasters, '  ONYX   coffee lab ')).toEqual(
      roasters[1],
    )
  })

  test('does not associate a partial name with the wrong roaster', () => {
    expect(findRoasterByName(roasters, 'Five Ways')).toBeUndefined()
  })

  test('does not match an empty suggestion', () => {
    expect(findRoasterByName(roasters, '   ')).toBeUndefined()
  })
})

describe('getExtractedRoasterAction', () => {
  test('creates a roaster when the extracted name is new', () => {
    expect(getExtractedRoasterAction(roasters, 'New Roaster', '')).toBe(
      'create',
    )
  })

  test('links a matching roaster when another or no roaster is selected', () => {
    expect(getExtractedRoasterAction(roasters, 'Onyx Coffee Lab', '')).toBe(
      'link',
    )
    expect(getExtractedRoasterAction(roasters, 'Onyx Coffee Lab', '1')).toBe(
      'link',
    )
  })

  test('recognizes when the matching roaster is already linked', () => {
    expect(getExtractedRoasterAction(roasters, 'Onyx Coffee Lab', '2')).toBe(
      'already-linked',
    )
  })

  test('has no action when no roaster name was extracted', () => {
    expect(getExtractedRoasterAction(roasters, undefined, '')).toBeNull()
    expect(getExtractedRoasterAction(roasters, '   ', '')).toBeNull()
  })
})
