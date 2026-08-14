import { describe, expect, test } from 'bun:test'
import { getLastBeanIdForBrewingMethod } from '@/lib/new-shot-defaults'

describe('new shot defaults', () => {
  const defaults = [
    { brewingMethodId: 1, beanId: 42 },
    { brewingMethodId: 2, beanId: 73 },
  ]

  test('returns the last bean associated with the selected method', () => {
    expect(getLastBeanIdForBrewingMethod(defaults, '2')).toBe('73')
  })

  test('clears the bean when the method has no previous bean', () => {
    expect(getLastBeanIdForBrewingMethod(defaults, '3')).toBe('')
    expect(
      getLastBeanIdForBrewingMethod(
        [{ brewingMethodId: 3, beanId: null }],
        '3',
      ),
    ).toBe('')
  })
})
