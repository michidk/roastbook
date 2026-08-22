import { describe, expect, test } from 'bun:test'
import { findRoasterByName } from '@/lib/roaster-match'

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
