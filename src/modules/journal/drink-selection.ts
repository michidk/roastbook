import type { JournalTransaction } from '@roastbook/journal-domain/state'

export function assertLocalDrinkSelection(
  tx: JournalTransaction,
  drinkTypeId: number | null | undefined,
  optionIds: readonly number[],
  brewingMethodId?: number,
) {
  const selected = [...new Set(optionIds)]
  if (!drinkTypeId) {
    if (selected.length)
      throw new Error('Choose a drink type before choosing drink options')
    return
  }
  tx.get('drinkTypes', drinkTypeId)
  if (brewingMethodId) {
    const assignments = tx
      .rows('brewingMethodDrinkTypes')
      .filter((row) => row.brewingMethodId === brewingMethodId)
    if (
      assignments.length &&
      !assignments.some((row) => row.drinkTypeId === drinkTypeId)
    )
      throw new Error('Choose a drink type available for this brewing method')
  }
  const groups = new Set<number>()
  for (const id of selected) {
    const value = tx.get('drinkOptionValues', id)
    if (
      value.isArchived ||
      !tx
        .rows('drinkTypeOptionGroups')
        .some(
          (row) =>
            row.drinkTypeId === drinkTypeId &&
            row.optionGroupId === value.groupId,
        )
    )
      throw new Error('Choose only options available for this drink type')
    if (groups.has(value.groupId))
      throw new Error('Choose at most one value from each drink option')
    groups.add(value.groupId)
  }
}
