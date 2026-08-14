import { describe, expect, test } from 'bun:test'
import {
  beanCreatePayload,
  beanUpdatePayload,
  createEmptyBeanFormValues,
} from '@/components/beans/bean-form-values'

describe('bean form payloads', () => {
  test('uses omitted values for creates and null values for updates', () => {
    const values = createEmptyBeanFormValues('  House blend  ')

    expect(beanCreatePayload(values)).toMatchObject({
      name: '  House blend  ',
      type: undefined,
      priceCurrency: 'EUR',
      roastDate: undefined,
    })
    expect(
      beanUpdatePayload(4, { ...values, priceCurrency: 'BTC' }),
    ).toMatchObject({
      id: 4,
      type: null,
      priceCurrency: null,
      roastDate: null,
    })
  })

  test('converts relational IDs and dates once at the form boundary', () => {
    const payload = beanCreatePayload({
      ...createEmptyBeanFormValues(),
      roasterId: '12',
      roastDate: '2026-08-14',
    })

    expect(payload.roasterId).toBe(12)
    expect(payload.roastDate?.toISOString()).toBe('2026-08-14T00:00:00.000Z')
  })
})
