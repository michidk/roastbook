import { eq } from 'drizzle-orm'
import { recipes, shots } from '@/db/schema'
import { withAccessoryGearIds } from '@/journal/domain/accessory-gear'
import { prepareRecipeWrite } from '@/journal/domain/recipe-mutations'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/journal/domain/shot-parameter-projection'
import { db, owned, runJournalMutations } from '@/journal/platform/database'
import { expectReturnedRow, notFound } from '@/lib/domain-errors'
import type { RecipeTarget } from '@/lib/recipe-target'
import type { ShotParameterInput } from '@/lib/shot-parameters'

type RecipeSource = ShotParameterInput & {
  brewingMethodId: number
  beanId: number | null
  drinkTypeId: number | null
  enabledParameters: readonly string[]
  drinkOptionValueIds: readonly number[]
}

export async function prepareRecipeFromShot(
  source: RecipeSource,
  target: RecipeTarget,
) {
  const existing =
    target.recipeId === undefined
      ? undefined
      : await db.query.recipes.findFirst({
          where: owned(recipes, eq(recipes.id, target.recipeId)),
        })
  if (target.recipeId !== undefined && !existing) throw notFound('Recipe')
  if (existing && existing.brewingMethodId !== source.brewingMethodId)
    throw new Error('Recipe does not use this brew’s brewing method')
  return prepareRecipeWrite({
    values: {
      name: existing?.name ?? target.name ?? '',
      brewingMethodId: source.brewingMethodId,
      beanId: source.beanId,
      drinkTypeId: source.drinkTypeId,
      ...projectShotParameters(source, source.enabledParameters),
    },
    existing,
    accessoryGearIds: projectAccessoryGearIds(source, source.enabledParameters),
    drinkOptionValueIds: source.drinkOptionValueIds,
  })
}

export async function prepareShotToRecipe(
  shotId: number,
  target: RecipeTarget,
) {
  const shot = await db.query.shots.findFirst({
    where: owned(shots, eq(shots.id, shotId)),
    with: {
      brewingMethod: true,
      drinkOptions: true,
      accessoryGearLinks: { columns: { gearId: true } },
    },
  })
  if (!shot) throw notFound('Brew')
  return prepareRecipeFromShot(
    {
      ...withAccessoryGearIds(shot),
      enabledParameters: shot.brewingMethod.enabledParameters,
      drinkOptionValueIds: shot.drinkOptions.map(
        ({ optionValueId }) => optionValueId,
      ),
    },
    target,
  )
}

export async function saveShotToRecipe(shotId: number, target: RecipeTarget) {
  const plan = await prepareShotToRecipe(shotId, target)
  await runJournalMutations(plan.mutations)
  return expectReturnedRow(
    await db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.id, plan.id)),
    }),
    'Recipe',
  )
}
