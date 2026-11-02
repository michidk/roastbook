import { eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  allocateJournalIds,
  type JournalMutation,
} from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import {
  gearSetAccessoryGear,
  recipeAccessoryGear,
  shotAccessoryGear,
} from '@/db/schema'

export async function replaceShotAccessoryGear(
  shotId: number,
  gearIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(shotAccessoryGear)
        .where(owned(shotAccessoryGear, eq(shotAccessoryGear.shotId, shotId)))
        .getSQL(),
    },
  ]
  const selectedIds = [...new Set(gearIds)]
  if (!selectedIds.length) return mutations
  const ids = await allocateJournalIds(shotAccessoryGear, selectedIds.length)
  const rows = ids.map((id, index) => {
    const gearId = selectedIds[index]
    if (gearId === undefined) throw new Error('Invalid accessory allocation')
    return { id, shotId, gearId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(shotAccessoryGear)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
}

export async function replaceRecipeAccessoryGear(
  recipeId: number,
  gearIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(recipeAccessoryGear)
        .where(
          owned(
            recipeAccessoryGear,
            eq(recipeAccessoryGear.recipeId, recipeId),
          ),
        )
        .getSQL(),
    },
  ]
  const selectedIds = [...new Set(gearIds)]
  if (!selectedIds.length) return mutations
  const ids = await allocateJournalIds(recipeAccessoryGear, selectedIds.length)
  const rows = ids.map((id, index) => {
    const gearId = selectedIds[index]
    if (gearId === undefined) throw new Error('Invalid accessory allocation')
    return { id, recipeId, gearId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(recipeAccessoryGear)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
}

export async function replaceGearSetAccessoryGear(
  gearSetId: number,
  gearIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(gearSetAccessoryGear)
        .where(
          owned(
            gearSetAccessoryGear,
            eq(gearSetAccessoryGear.gearSetId, gearSetId),
          ),
        )
        .getSQL(),
    },
  ]
  const selectedIds = [...new Set(gearIds)]
  if (!selectedIds.length) return mutations
  const ids = await allocateJournalIds(gearSetAccessoryGear, selectedIds.length)
  const rows = ids.map((id, index) => {
    const gearId = selectedIds[index]
    if (gearId === undefined) throw new Error('Invalid accessory allocation')
    return { id, gearSetId, gearId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(gearSetAccessoryGear)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
}

export function withAccessoryGearIds<
  Row extends {
    readonly accessoryGearLinks: readonly { readonly gearId: number }[]
  },
>(row: Row) {
  const { accessoryGearLinks, ...values } = row
  return {
    ...values,
    accessoryGearIds: accessoryGearLinks.map(({ gearId }) => gearId),
  }
}
