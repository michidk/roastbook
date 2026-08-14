import { describe, expect, test } from 'bun:test'
import {
  cafeVisitCreatePayload,
  cafeVisitUpdatePayload,
} from '@/lib/cafe-visit-payload'

const emptyValues = {
  beanId: '',
  drinkName: '',
  drinkType: '',
  price: '',
  currency: '',
  notes: '   ',
}

describe('café visit payloads', () => {
  test('omits blank create values', () => {
    expect(cafeVisitCreatePayload(emptyValues)).toEqual({
      beanId: undefined,
      drinkName: undefined,
      drinkType: undefined,
      price: undefined,
      currency: undefined,
      notes: undefined,
    })
  })

  test('clears blank update values', () => {
    expect(cafeVisitUpdatePayload(emptyValues)).toEqual({
      beanId: null,
      drinkName: null,
      drinkType: null,
      price: null,
      currency: null,
      notes: null,
    })
  })
})
