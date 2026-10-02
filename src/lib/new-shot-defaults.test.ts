import { describe, expect, test } from 'bun:test'
import { beanSelectionForBrewingMethod } from '@/lib/new-shot-defaults'

describe('new shot defaults', () => {
  const defaults = [
    { brewingMethodId: 1, beanId: 42, beanPurchaseId: 52 },
    { brewingMethodId: 2, beanId: 73, beanPurchaseId: 91 },
  ]

  test('returns the last bean associated with the selected method', () => {
    expect(beanSelectionForBrewingMethod(defaults, '2')).toEqual({
      beanId: '73',
      beanPurchaseId: '91',
    })
  })

  test('clears the bean when the method has no previous bean', () => {
    const cleared = { beanId: '', beanPurchaseId: '' }
    expect(beanSelectionForBrewingMethod(defaults, '3')).toEqual(cleared)
    expect(
      beanSelectionForBrewingMethod(
        [{ brewingMethodId: 3, beanId: null, beanPurchaseId: null }],
        '3',
      ),
    ).toEqual(cleared)
  })

  test('keeps beans the user chose when the method changes', () => {
    const chosen = { beanId: '5', beanPurchaseId: '8' }
    expect(beanSelectionForBrewingMethod(defaults, '2', chosen)).toBe(chosen)
  })

  test('uses the method beans when no bag was chosen', () => {
    expect(
      beanSelectionForBrewingMethod(defaults, '1', {
        beanId: '',
        beanPurchaseId: '',
      }),
    ).toEqual({ beanId: '42', beanPurchaseId: '52' })
  })
})
