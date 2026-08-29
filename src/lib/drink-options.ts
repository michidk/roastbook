export type DrinkTypeOption = {
  readonly id: number
  readonly name: string
  readonly optionGroupIds: readonly number[]
}

export type DrinkOptionGroup = {
  readonly id: number
  readonly name: string
  readonly values: readonly { readonly id: number; readonly name: string }[]
}

export type DrinkConfiguration = {
  readonly drinkTypes: readonly DrinkTypeOption[]
  readonly optionGroups: readonly DrinkOptionGroup[]
}

export type DrinkSelectionValues = {
  readonly drinkTypeId: string
  readonly drinkOptionValueIds: Readonly<Record<string, string>>
}

export type BrewingMethodDrinkTypes = {
  readonly drinkTypeIds: readonly number[]
}

export function drinkConfigurationForBrewingMethod(
  configuration: DrinkConfiguration,
  method: BrewingMethodDrinkTypes | null | undefined,
): DrinkConfiguration {
  if (!method || method.drinkTypeIds.length === 0) return configuration
  const allowedTypeIds = new Set(method.drinkTypeIds)
  return {
    ...configuration,
    drinkTypes: configuration.drinkTypes.filter((type) =>
      allowedTypeIds.has(type.id),
    ),
  }
}

export function drinkSelectionForConfiguration(
  configuration: DrinkConfiguration,
  values: DrinkSelectionValues,
): DrinkSelectionValues {
  if (
    !values.drinkTypeId ||
    configuration.drinkTypes.some(
      (type) => String(type.id) === values.drinkTypeId,
    )
  ) {
    return values
  }
  return { drinkTypeId: '', drinkOptionValueIds: {} }
}

export function optionGroupsForDrinkType(
  configuration: DrinkConfiguration,
  drinkTypeId: string,
) {
  const drinkType = configuration.drinkTypes.find(
    (item) => String(item.id) === drinkTypeId,
  )
  if (!drinkType) return []
  const enabled = new Set(drinkType.optionGroupIds)
  return configuration.optionGroups.filter((group) => enabled.has(group.id))
}

export function selectedDrinkOptionValueIds(
  configuration: DrinkConfiguration,
  values: DrinkSelectionValues,
) {
  const activeGroups = optionGroupsForDrinkType(
    configuration,
    values.drinkTypeId,
  )
  return activeGroups.flatMap((group) => {
    const selected = values.drinkOptionValueIds[String(group.id)]
    return selected ? [Number(selected)] : []
  })
}
