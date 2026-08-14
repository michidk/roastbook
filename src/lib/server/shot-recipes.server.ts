import { eq } from 'drizzle-orm'
import type { db } from '@/db'
import { recipes, shots } from '@/db/schema'
import { expectReturnedRow, notFound } from '@/lib/domain-errors'
import type { RecipeTarget } from '@/lib/recipe-target'
import {
  replaceRecipeAccessoryGear,
  withAccessoryGearIds,
} from '@/lib/server/accessory-gear.server'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/lib/server/shot-parameter-projection'

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function saveShotToRecipeInTransaction(
  tx: DatabaseTransaction,
  shotId: number,
  target: RecipeTarget,
) {
  const shot = await tx.query.shots.findFirst({
    where: eq(shots.id, shotId),
    with: {
      brewingMethod: true,
      accessoryGearLinks: { columns: { gearId: true } },
    },
  })
  if (!shot) throw notFound('Shot')

  const shotValues = withAccessoryGearIds(shot)
  const values = {
    brewingMethodId: shot.brewingMethodId,
    beanId: shot.beanId,
    ...projectShotParameters(shotValues, shot.brewingMethod.enabledParameters),
    updatedAt: new Date(),
  }

  let recipe: typeof recipes.$inferSelect
  if (target.recipeId !== undefined) {
    const existingRecipe = await tx.query.recipes.findFirst({
      where: eq(recipes.id, target.recipeId),
      columns: { id: true, brewingMethodId: true },
    })
    if (!existingRecipe) throw notFound('Recipe')
    if (existingRecipe.brewingMethodId !== shot.brewingMethodId) {
      throw new Error('Recipe does not use this brew’s brewing method')
    }

    const [updatedRecipe] = await tx
      .update(recipes)
      .set(values)
      .where(eq(recipes.id, target.recipeId))
      .returning()
    recipe = expectReturnedRow(updatedRecipe, 'Recipe')
  } else {
    const [createdRecipe] = await tx
      .insert(recipes)
      .values({ ...values, name: target.name ?? '' })
      .returning()
    recipe = expectReturnedRow(createdRecipe, 'Recipe')
  }

  await replaceRecipeAccessoryGear(
    tx,
    recipe.id,
    projectAccessoryGearIds(shotValues, shot.brewingMethod.enabledParameters),
  )
  await tx
    .update(shots)
    .set({ recipeId: recipe.id, updatedAt: new Date() })
    .where(eq(shots.id, shot.id))

  return recipe
}
