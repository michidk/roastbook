import { describe, expect, test } from 'bun:test'
import { getPaginationWindow } from '@/lib/pagination'

describe('pagination windows', () => {
  test('keeps an empty collection on its first page', () => {
    expect(getPaginationWindow(0, 4, 25)).toEqual({
      page: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 1,
      offset: 0,
    })
  })

  test('clamps requests beyond the final page', () => {
    expect(getPaginationWindow(51, 9, 25)).toEqual({
      page: 3,
      pageSize: 25,
      totalItems: 51,
      totalPages: 3,
      offset: 50,
    })
  })

  test('calculates the requested page offset', () => {
    expect(getPaginationWindow(75, 2, 25)).toEqual({
      page: 2,
      pageSize: 25,
      totalItems: 75,
      totalPages: 3,
      offset: 25,
    })
  })
})
