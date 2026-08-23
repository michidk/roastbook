import { describe, expect, test } from 'bun:test'
import { getPaginationItems, getPaginationWindow } from '@/lib/pagination'

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

describe('pagination items', () => {
  test('shows every page when the result fits', () => {
    expect(getPaginationItems(2, 4)).toEqual([1, 2, 3, 4])
  })

  test('keeps the first pages visible near the beginning', () => {
    expect(getPaginationItems(3, 12)).toEqual([
      1,
      2,
      3,
      4,
      5,
      'end-ellipsis',
      12,
    ])
  })

  test('shows adjacent pages in the middle on larger screens', () => {
    expect(getPaginationItems(6, 12)).toEqual([
      1,
      'start-ellipsis',
      5,
      6,
      7,
      'end-ellipsis',
      12,
    ])
  })

  test('keeps the last pages visible near the end', () => {
    expect(getPaginationItems(10, 12)).toEqual([
      1,
      'start-ellipsis',
      8,
      9,
      10,
      11,
      12,
    ])
  })

  test('uses a narrower window on small screens', () => {
    expect(getPaginationItems(6, 12, 5)).toEqual([
      1,
      'start-ellipsis',
      6,
      'end-ellipsis',
      12,
    ])
  })

  test('keeps three direct links visible at a small-screen edge', () => {
    expect(getPaginationItems(3, 12, 5)).toEqual([1, 2, 3, 'end-ellipsis', 12])
  })
})
