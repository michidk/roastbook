import { eq } from 'drizzle-orm'
import type { db } from '@/db'
import { recipeAccessoryGear, shotAccessoryGear } from '@/db/schema'

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function replaceShotAccessoryGear(
  tx: DatabaseTransaction,
  shotId: number,
  gearIds: readonly number[],
) {
  await tx.delete(shotAccessoryGear).where(eq(shotAccessoryGear.shotId, shotId))
  if (gearIds.length > 0) {
    await tx
      .insert(shotAccessoryGear)
      .values([...new Set(gearIds)].map((gearId) => ({ shotId, gearId })))
  }
}

export async function replaceRecipeAccessoryGear(
  tx: DatabaseTransaction,
  recipeId: number,
  gearIds: readonly number[],
) {
  await tx
    .delete(recipeAccessoryGear)
    .where(eq(recipeAccessoryGear.recipeId, recipeId))
  if (gearIds.length > 0) {
    await tx
      .insert(recipeAccessoryGear)
      .values([...new Set(gearIds)].map((gearId) => ({ recipeId, gearId })))
  }
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
