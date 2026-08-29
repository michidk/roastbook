import { describe, expect, test } from 'bun:test'
import {
  cafeVisitCreatePayload,
  cafeVisitUpdatePayload,
} from '@/lib/cafe-visit-payload'

const emptyValues = {
  beanId: '',
  drinkTypeId: '',
  drinkOptionValueIds: {},
  price: '',
  currency: '',
  notes: '   ',
}

describe('café visit payloads', () => {
  test('omits blank create values', () => {
    expect(cafeVisitCreatePayload(emptyValues)).toEqual({
      beanId: undefined,
      drinkTypeId: undefined,
      drinkOptionValueIds: [],
      price: undefined,
      currency: undefined,
      notes: undefined,
    })
  })

  test('clears blank update values', () => {
    expect(cafeVisitUpdatePayload(emptyValues)).toEqual({
      beanId: null,
      drinkTypeId: null,
      drinkOptionValueIds: [],
      price: null,
      currency: null,
      notes: null,
    })
  })
})
