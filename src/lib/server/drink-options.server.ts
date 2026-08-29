import { and, eq, inArray } from 'drizzle-orm'
import type { db } from '@/db'
import {
  brewingMethodDrinkTypes,
  cafeVisitDrinkOptions,
  drinkOptionValues,
  drinkTypeOptionGroups,
  shotDrinkOptions,
} from '@/db/schema'

type DrinkOptionTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export async function assertDrinkTypeAvailableForBrewingMethod(
  tx: DrinkOptionTransaction,
  brewingMethodId: number,
  drinkTypeId: number | null | undefined,
) {
  if (!drinkTypeId) return
  const assignments = await tx
    .select({ drinkTypeId: brewingMethodDrinkTypes.drinkTypeId })
    .from(brewingMethodDrinkTypes)
    .where(eq(brewingMethodDrinkTypes.brewingMethodId, brewingMethodId))
  if (
    assignments.length > 0 &&
    !assignments.some((assignment) => assignment.drinkTypeId === drinkTypeId)
  ) {
    throw new Error('Choose a drink type available for this brewing method')
  }
}

export async function assertDrinkSelection(
  tx: DrinkOptionTransaction,
  drinkTypeId: number | null | undefined,
  optionValueIds: readonly number[] | undefined,
) {
  const selectedIds = [...new Set(optionValueIds ?? [])]
  if (!drinkTypeId) {
    if (selectedIds.length > 0) {
      throw new Error('Choose a drink type before choosing drink options')
    }
    return
  }
  if (selectedIds.length === 0) return

  const rows = await tx
    .select({
      id: drinkOptionValues.id,
      groupId: drinkOptionValues.groupId,
    })
    .from(drinkOptionValues)
    .innerJoin(
      drinkTypeOptionGroups,
      and(
        eq(drinkTypeOptionGroups.optionGroupId, drinkOptionValues.groupId),
        eq(drinkTypeOptionGroups.drinkTypeId, drinkTypeId),
      ),
    )
    .where(
      and(
        inArray(drinkOptionValues.id, selectedIds),
        eq(drinkOptionValues.isArchived, false),
      ),
    )

  if (rows.length !== selectedIds.length) {
    throw new Error('Choose only options available for this drink type')
  }
  if (new Set(rows.map((row) => row.groupId)).size !== rows.length) {
    throw new Error('Choose at most one value from each drink option')
  }
}

export async function replaceShotDrinkOptions(
  tx: DrinkOptionTransaction,
  shotId: number,
  optionValueIds: readonly number[],
) {
  await tx.delete(shotDrinkOptions).where(eq(shotDrinkOptions.shotId, shotId))
  const selectedIds = [...new Set(optionValueIds)]
  if (selectedIds.length === 0) return
  await tx
    .insert(shotDrinkOptions)
    .values(selectedIds.map((optionValueId) => ({ shotId, optionValueId })))
}

export async function replaceCafeVisitDrinkOptions(
  tx: DrinkOptionTransaction,
  cafeVisitId: number,
  optionValueIds: readonly number[],
) {
  await tx
    .delete(cafeVisitDrinkOptions)
    .where(eq(cafeVisitDrinkOptions.cafeVisitId, cafeVisitId))
  const selectedIds = [...new Set(optionValueIds)]
  if (selectedIds.length === 0) return
  await tx
    .insert(cafeVisitDrinkOptions)
    .values(
      selectedIds.map((optionValueId) => ({ cafeVisitId, optionValueId })),
    )
}
