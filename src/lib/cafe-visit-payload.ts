export type CafeVisitFormValues = {
  readonly beanId: string
  readonly drinkName: string
  readonly drinkType: string
  readonly price: string
  readonly currency: string
  readonly notes: string
}

export function cafeVisitCreatePayload(values: CafeVisitFormValues) {
  return {
    beanId: values.beanId ? Number(values.beanId) : undefined,
    drinkName: blankToUndefined(values.drinkName),
    drinkType: blankToUndefined(values.drinkType),
    price: blankToUndefined(values.price),
    currency: blankToUndefined(values.currency),
    notes: blankToUndefined(values.notes),
  }
}

export function cafeVisitUpdatePayload(values: CafeVisitFormValues) {
  return {
    beanId: values.beanId ? Number(values.beanId) : null,
    drinkName: blankToNull(values.drinkName),
    drinkType: blankToNull(values.drinkType),
    price: blankToNull(values.price),
    currency: blankToNull(values.currency),
    notes: blankToNull(values.notes),
  }
}

import { blankToNull, blankToUndefined } from '@/lib/form-value-normalization'
