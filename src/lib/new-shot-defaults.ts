type LastBeanByBrewingMethod = {
  readonly brewingMethodId: number
  readonly beanId: number | null
  readonly beanPurchaseId?: number | null
}

function getLastBeanPurchaseIdForBrewingMethod(
  defaults: readonly LastBeanByBrewingMethod[],
  brewingMethodId: string,
): string {
  const match = defaults.find(
    (item) => String(item.brewingMethodId) === brewingMethodId,
  )
  return match?.beanPurchaseId ? String(match.beanPurchaseId) : ''
}

function getLastBeanIdForBrewingMethod(
  defaults: readonly LastBeanByBrewingMethod[],
  brewingMethodId: string,
): string {
  const match = defaults.find(
    (item) => String(item.brewingMethodId) === brewingMethodId,
  )
  return match?.beanId ? String(match.beanId) : ''
}

type BeanSelection = {
  readonly beanId: string
  readonly beanPurchaseId: string
}

/**
 * Beans the user chose on purpose, from a bean page or the picker, survive a
 * brewing-method change; otherwise the method's last-used beans apply.
 */
export function beanSelectionForBrewingMethod(
  defaults: readonly LastBeanByBrewingMethod[],
  brewingMethodId: string,
  chosen?: BeanSelection,
): BeanSelection {
  if (chosen?.beanPurchaseId) return chosen
  return {
    beanId: getLastBeanIdForBrewingMethod(defaults, brewingMethodId),
    beanPurchaseId: getLastBeanPurchaseIdForBrewingMethod(
      defaults,
      brewingMethodId,
    ),
  }
}
