import { describe, expect, test } from 'bun:test'
import {
  coffeeShopCreatePayload,
  coffeeShopUpdatePayload,
  createCoffeeShopFormValues,
} from '@/components/coffee-shops/coffee-shop-form-values'

describe('coffee shop form payloads', () => {
  test('omits blank fields when creating', () => {
    expect(
      coffeeShopCreatePayload(createCoffeeShopFormValues(null, 'Café')),
    ).toMatchObject({ name: 'Café', address: undefined, latitude: undefined })
  })

  test('uses null to clear every nullable field when updating', () => {
    expect(
      coffeeShopUpdatePayload(7, createCoffeeShopFormValues(null, 'Café')),
    ).toEqual({
      id: 7,
      name: 'Café',
      address: null,
      city: null,
      country: null,
      latitude: null,
      longitude: null,
      website: null,
      notes: null,
    })
  })
})
