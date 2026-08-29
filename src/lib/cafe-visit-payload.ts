export type CafeVisitFormValues = {
  readonly beanId: string
  readonly drinkTypeId: string
  readonly drinkOptionValueIds: Readonly<Record<string, string>>
  readonly price: string
  readonly currency: string
  readonly notes: string
}

export function cafeVisitCreatePayload(values: CafeVisitFormValues) {
  return {
    beanId: values.beanId ? Number(values.beanId) : undefined,
    drinkTypeId: values.drinkTypeId ? Number(values.drinkTypeId) : undefined,
    drinkOptionValueIds: Object.values(values.drinkOptionValueIds)
      .filter(Boolean)
      .map(Number),
    price: blankToUndefined(values.price),
    currency: blankToUndefined(values.currency),
    notes: blankToUndefined(values.notes),
  }
}

export function cafeVisitUpdatePayload(values: CafeVisitFormValues) {
  return {
    beanId: values.beanId ? Number(values.beanId) : null,
    drinkTypeId: values.drinkTypeId ? Number(values.drinkTypeId) : null,
    drinkOptionValueIds: Object.values(values.drinkOptionValueIds)
      .filter(Boolean)
      .map(Number),
    price: blankToNull(values.price),
    currency: blankToNull(values.currency),
    notes: blankToNull(values.notes),
  }
}

import { blankToNull, blankToUndefined } from '@/lib/form-value-normalization'
