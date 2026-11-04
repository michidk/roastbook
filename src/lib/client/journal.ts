import type { z } from 'zod'
import {
  createRecipe,
  deleteRecipe,
  type getRecipe,
  saveShotAsRecipe,
  updateRecipe,
} from '@/journal/recipes'
import {
  createShot,
  createShotAndSaveRecipe,
  deleteShot,
  updateShot,
} from '@/journal/shots'
import type { newShotPayload } from '@/lib/new-shot-payload'
import { recipePayload } from '@/lib/new-shot-payload'
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/recipe-input'
import { recipeTargetSchema, shotRecipeTargetSchema } from '@/lib/recipe-target'
import { shotCreateSchema, shotUpdateSchema } from '@/lib/server-validation'
import { shotFormValuesFrom } from '@/modules/brews/shot-form-values'

// Form actions: each validates the form's payload and runs one journal write.
type BrewCreate = ReturnType<typeof newShotPayload>
type BrewUpdate = Omit<z.input<typeof shotUpdateSchema>, 'tasteTagIds'> & {
  readonly tasteTagIds?: readonly number[]
}
type RecipeTarget = { readonly recipeId: number } | { readonly name: string }

export function addRecipe(data: z.input<typeof recipeCreateSchema>) {
  return createRecipe({ data: recipeCreateSchema.parse(data) })
}
export function editRecipe(data: z.input<typeof recipeUpdateSchema>) {
  return updateRecipe({ data: recipeUpdateSchema.parse(data) })
}
export function editBrew(data: BrewUpdate) {
  return updateShot({ data: shotUpdateSchema.parse(data) })
}
export function removeJournalEntity({
  entityType,
  id,
  revision,
}: {
  readonly entityType: 'brew' | 'recipe'
  readonly id: number
  readonly revision: number
}) {
  const data = { id, baseRevision: revision, idempotent: true }
  return entityType === 'brew' ? deleteShot({ data }) : deleteRecipe({ data })
}
export function saveBrewToRecipe(data: z.input<typeof shotRecipeTargetSchema>) {
  return saveShotAsRecipe({ data: shotRecipeTargetSchema.parse(data) })
}
export async function addBrew({
  data,
  target,
}: {
  readonly data: BrewCreate
  readonly target: RecipeTarget | null
}) {
  const payload = shotCreateSchema.parse(data)
  if (!target) return createShot({ data: payload })
  recipeTargetSchema.parse(target)
  return (await createShotAndSaveRecipe({ data: { shot: payload, target } }))
    .shot
}
export function copyRecipe(
  recipe: NonNullable<Awaited<ReturnType<typeof getRecipe>>>,
) {
  return addRecipe({
    name: `${recipe.name} (copy)`,
    ...recipePayload(shotFormValuesFrom(recipe)),
  })
}
