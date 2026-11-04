import { and, eq, inArray } from 'drizzle-orm'
import {
  brewingMethodDrinkTypes,
  cafeVisitDrinkOptions,
  drinkOptionValues,
  drinkTypeOptionGroups,
  recipeDrinkOptions,
  shotDrinkOptions,
} from '@/db/schema'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
} from '@/journal/platform/database'

type DrinkOptionReader = Pick<typeof db, 'select' | 'query'>

export async function assertDrinkTypeAvailableForBrewingMethod(
  tx: DrinkOptionReader,
  brewingMethodId: number,
  drinkTypeId: number | null | undefined,
) {
  if (!drinkTypeId) return
  const assignments = await tx
    .select({ drinkTypeId: brewingMethodDrinkTypes.drinkTypeId })
    .from(brewingMethodDrinkTypes)
    .where(
      owned(
        brewingMethodDrinkTypes,
        eq(brewingMethodDrinkTypes.brewingMethodId, brewingMethodId),
      ),
    )
  if (
    assignments.length > 0 &&
    !assignments.some((assignment) => assignment.drinkTypeId === drinkTypeId)
  ) {
    throw new Error('Choose a drink type available for this brewing method')
  }
}

export async function assertDrinkSelection(
  tx: DrinkOptionReader,
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
        eq(drinkTypeOptionGroups.ownerId, drinkOptionValues.ownerId),
        eq(drinkTypeOptionGroups.optionGroupId, drinkOptionValues.groupId),
        eq(drinkTypeOptionGroups.drinkTypeId, drinkTypeId),
      ),
    )
    .where(
      owned(
        drinkOptionValues,
        and(
          inArray(drinkOptionValues.id, selectedIds),
          eq(drinkOptionValues.isArchived, false),
        ),
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
  shotId: number,
  optionValueIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(shotDrinkOptions)
        .where(owned(shotDrinkOptions, eq(shotDrinkOptions.shotId, shotId)))
        .getSQL(),
    },
  ]
  const selectedIds = [...new Set(optionValueIds)]
  if (!selectedIds.length) return mutations
  const ids = await allocateJournalIds(shotDrinkOptions, selectedIds.length)
  const rows = ids.map((id, index) => {
    const optionValueId = selectedIds[index]
    if (optionValueId === undefined)
      throw new Error('Invalid option allocation')
    return { id, shotId, optionValueId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(shotDrinkOptions)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
}

export async function replaceCafeVisitDrinkOptions(
  cafeVisitId: number,
  optionValueIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(cafeVisitDrinkOptions)
        .where(
          owned(
            cafeVisitDrinkOptions,
            eq(cafeVisitDrinkOptions.cafeVisitId, cafeVisitId),
          ),
        )
        .getSQL(),
    },
  ]
  const selectedIds = [...new Set(optionValueIds)]
  if (!selectedIds.length) return mutations
  const ids = await allocateJournalIds(
    cafeVisitDrinkOptions,
    selectedIds.length,
  )
  const rows = ids.map((id, index) => {
    const optionValueId = selectedIds[index]
    if (optionValueId === undefined)
      throw new Error('Invalid option allocation')
    return { id, cafeVisitId, optionValueId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(cafeVisitDrinkOptions)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
}

export async function replaceRecipeDrinkOptions(
  recipeId: number,
  optionValueIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(recipeDrinkOptions)
        .where(
          owned(recipeDrinkOptions, eq(recipeDrinkOptions.recipeId, recipeId)),
        )
        .getSQL(),
    },
  ]
  const selectedIds = [...new Set(optionValueIds)]
  if (!selectedIds.length) return mutations
  const ids = await allocateJournalIds(recipeDrinkOptions, selectedIds.length)
  const rows = ids.map((id, index) => {
    const optionValueId = selectedIds[index]
    if (optionValueId === undefined)
      throw new Error('Invalid option allocation')
    return { id, recipeId, optionValueId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(recipeDrinkOptions)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
}
