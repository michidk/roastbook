type LastBeanByBrewingMethod = {
  readonly brewingMethodId: number
  readonly beanId: number | null
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
