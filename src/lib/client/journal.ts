import type { z } from 'zod'
import { requireFeature } from '@/lib/app-capabilities'
import type { newShotPayload } from '@/lib/new-shot-payload'
import { recipePayload } from '@/lib/new-shot-payload'
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/recipe-input'
import { recipeTargetSchema, shotRecipeTargetSchema } from '@/lib/recipe-target'
import { shotCreateSchema, shotUpdateSchema } from '@/lib/server-validation'
import { shotFormValuesFrom } from '@/modules/brews/shot-form-values'
import type { EntityMutationSummary } from '@/modules/offline/entity-operations'
import type { JournalMutationResult } from '@/modules/offline/mutation'
import type { PendingBrewSummary } from '@/modules/offline/types'
import {
  createRecipe,
  deleteRecipe,
  type getRecipe,
  saveShotAsRecipe,
  updateRecipe,
} from './journal/recipes'
import {
  createShot,
  createShotAndSaveRecipe,
  deleteShot,
  updateShot,
} from './journal/shots'

type BrewCreate = ReturnType<typeof newShotPayload> & {
  readonly clientOperationId?: string
}
type BrewUpdate = Omit<z.input<typeof shotUpdateSchema>, 'tasteTagIds'> & {
  readonly tasteTagIds?: readonly number[]
}
type RecipeTarget = { readonly recipeId: number } | { readonly name: string }
async function saved<T>(
  send: () => Promise<T>,
): Promise<JournalMutationResult<T>> {
  requireFeature('journal-write')
  return { kind: 'saved', value: await send() }
}
export function addRecipe(
  data: z.input<typeof recipeCreateSchema>,
  _details: EntityMutationSummary,
) {
  const payload = recipeCreateSchema.parse(data)
  return saved(() => createRecipe({ data: payload }))
}
export function editRecipe(
  data: z.input<typeof recipeUpdateSchema>,
  _details: EntityMutationSummary,
) {
  const payload = recipeUpdateSchema.parse(data)
  return saved(() => updateRecipe({ data: payload }))
}
export function editBrew(data: BrewUpdate, _details: EntityMutationSummary) {
  const payload = shotUpdateSchema.parse(data)
  return saved(() => updateShot({ data: payload }))
}
export function removeJournalEntity({
  entityType,
  id,
  revision,
}: {
  readonly entityType: 'brew' | 'recipe'
  readonly id: number
  readonly revision: number
  readonly details: EntityMutationSummary
}) {
  return saved(() =>
    entityType === 'brew'
      ? deleteShot({ data: { id, baseRevision: revision, idempotent: true } })
      : deleteRecipe({
          data: { id, baseRevision: revision, idempotent: true },
        }),
  )
}
export function saveBrewToRecipe(
  data: z.input<typeof shotRecipeTargetSchema>,
  _details: EntityMutationSummary,
) {
  const payload = shotRecipeTargetSchema.parse(data)
  return saved(() => saveShotAsRecipe({ data: payload }))
}
export function addBrew({
  data,
  target,
}: {
  readonly data: BrewCreate
  readonly summary: PendingBrewSummary
  readonly target: RecipeTarget | null
  readonly holdForTasting?: boolean
}) {
  const payload = shotCreateSchema.parse(data)
  if (target) recipeTargetSchema.parse(target)
  return saved(async () =>
    target
      ? (await createShotAndSaveRecipe({ data: { shot: payload, target } }))
          .shot
      : createShot({ data: payload }),
  )
}
export function copyRecipe(
  recipe: NonNullable<Awaited<ReturnType<typeof getRecipe>>>,
) {
  return addRecipe(
    {
      name: `${recipe.name} (copy)`,
      ...recipePayload(shotFormValuesFrom(recipe)),
    },
    { label: `${recipe.name} (copy)`, detail: 'Recipe' },
  )
}
