import { describe, expect, test } from 'bun:test'
import { estimateRemainingBeanWeight } from '@/lib/bean-weight'

describe('bean weight estimate', () => {
  test('subtracts logged doses from the initial bag weight', () => {
    expect(estimateRemainingBeanWeight('120', '72')).toEqual({
      initialWeight: 120,
      usedWeight: 72,
      remainingWeight: 48,
      percentRemaining: 40,
    })
  })

  test('clamps an overused bag at empty', () => {
    expect(estimateRemainingBeanWeight('100', '120')).toEqual({
      initialWeight: 100,
      usedWeight: 120,
      remainingWeight: 0,
      percentRemaining: 0,
    })
  })

  test('returns no estimate without a positive initial weight', () => {
    expect(estimateRemainingBeanWeight(null, '20')).toBeNull()
    expect(estimateRemainingBeanWeight('0', '20')).toBeNull()
    expect(estimateRemainingBeanWeight('not-a-number', '20')).toBeNull()
  })
})
