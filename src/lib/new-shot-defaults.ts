type LastBeanByBrewingMethod = {
  readonly brewingMethodId: number
  readonly beanId: number | null
  readonly beanPurchaseId?: number | null
}

export function getLastBeanPurchaseIdForBrewingMethod(
  defaults: readonly LastBeanByBrewingMethod[],
  brewingMethodId: string,
): string {
  const match = defaults.find(
    (item) => String(item.brewingMethodId) === brewingMethodId,
  )
  return match?.beanPurchaseId ? String(match.beanPurchaseId) : ''
}

export function getLastBeanIdForBrewingMethod(
  defaults: readonly LastBeanByBrewingMethod[],
  brewingMethodId: string,
): string {
  const match = defaults.find(
    (item) => String(item.brewingMethodId) === brewingMethodId,
  )
  return match?.beanId ? String(match.beanId) : ''
}
