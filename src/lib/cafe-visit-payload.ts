type CafeVisitFormValues = {
  readonly beanId: string
  readonly drinkName: string
  readonly drinkType: string
  readonly price: string
  readonly currency: string
  readonly notes: string
}

export function cafeVisitDetailsPayload(
  values: CafeVisitFormValues,
  emptyBeanId: null | undefined,
) {
  return {
    beanId: values.beanId ? Number(values.beanId) : emptyBeanId,
    drinkName: values.drinkName || undefined,
    drinkType: values.drinkType || undefined,
    price: values.price || undefined,
    currency: values.currency || undefined,
    notes: values.notes || undefined,
  }
}
