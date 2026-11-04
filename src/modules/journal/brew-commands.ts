import type { JournalRow } from '@roastbook/journal-domain/model'
import { z } from 'zod'
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/recipe-input'
import { recipeTargetSchema, shotRecipeTargetSchema } from '@/lib/recipe-target'
import {
  deleteRecordSchema,
  positiveIdSchema,
  shotCreateSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'
import {
  type CommandContext,
  defineCommand,
  replaceLinks,
} from './command-context'
import { assertLocalDrinkSelection } from './drink-selection'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from './shot-parameter-projection'

type BrewInput = z.infer<typeof shotCreateSchema>
type RecipeInput = z.infer<typeof recipeCreateSchema>
function checkRevision(
  current: { revision: number; updatedAt: string },
  data: { baseRevision?: number; baseUpdatedAt?: string },
) {
  if (
    (data.baseRevision !== undefined &&
      data.baseRevision !== current.revision) ||
    (data.baseRevision === undefined &&
      data.baseUpdatedAt !== undefined &&
      data.baseUpdatedAt !== current.updatedAt)
  )
    throw new Error('This record changed. Reload and try again.')
}
function brewRelations(
  { tx }: CommandContext,
  id: number,
  data: BrewInput,
  parameters: readonly string[],
) {
  if (data.drinkOptionValueIds)
    replaceLinks(
      tx,
      'shotDrinkOptions',
      'shotId',
      id,
      [...new Set(data.drinkOptionValueIds)].map((optionValueId) => ({
        shotId: id,
        optionValueId,
      })),
    )
  if (data.tasteTagIds)
    replaceLinks(
      tx,
      'shotTasteTags',
      'shotId',
      id,
      [...new Set(data.tasteTagIds)].map((tasteTagId) => ({
        shotId: id,
        tasteTagId,
      })),
    )
  replaceLinks(
    tx,
    'shotAccessoryGear',
    'shotId',
    id,
    projectAccessoryGearIds(data, parameters).map((gearId) => ({
      shotId: id,
      gearId,
    })),
  )
}
function saveBrew(
  context: CommandContext,
  data: BrewInput & {
    id?: number
    baseRevision?: number
    baseUpdatedAt?: string
  },
) {
  const { tx } = context
  assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
  const method = tx.get('brewingMethods', data.brewingMethodId)
  const parameters = z.array(z.string()).parse(method.enabledParameters)
  assertLocalDrinkSelection(
    tx,
    data.drinkTypeId,
    data.drinkOptionValueIds ?? [],
    method.id,
  )
  const purchase = data.beanPurchaseId
    ? tx.get('beanPurchases', data.beanPurchaseId)
    : null
  if (purchase && data.beanId && data.beanId !== purchase.beanId)
    throw new Error('Selected bag does not belong to these beans')
  const current = data.id ? tx.get('shots', data.id) : null
  if (current) checkRevision(current, data)
  const projected = projectShotParameters(data, parameters)
  const machineSettingRevisionId =
    projected.machineId === current?.machineId
      ? current.machineSettingRevisionId
      : (tx
          .rows('espressoMachineSettingRevisions')
          .find(
            (row) =>
              row.gearId === projected.machineId &&
              row.kind === 'owner' &&
              row.supersededAt === null,
          )?.id ?? null)
  const values = {
    ...projected,
    brewingMethodId: method.id,
    beanId: purchase?.beanId ?? data.beanId ?? null,
    beanPurchaseId: purchase?.id ?? null,
    drinkTypeId: data.drinkTypeId ?? null,
    brewedAt: data.brewedAt?.toISOString() ?? current?.brewedAt ?? context.now,
    machineSettingRevisionId,
    rating: data.rating ?? null,
    extractionBalance: data.extractionBalance ?? null,
    bitterness: data.bitterness ?? null,
    acidity: data.acidity ?? null,
    sweetness: data.sweetness ?? null,
    body: data.body ?? null,
    astringency: data.astringency ?? null,
    notes: data.notes ?? null,
  }
  const saved = current
    ? tx.update('shots', current.id, {
        ...values,
        revision: current.revision + 1,
      })
    : tx.insert('shots', {
        ...values,
        clientOperationId: data.clientOperationId ?? null,
      })
  brewRelations(context, saved.id, data, parameters)
  return saved
}
function saveRecipe(
  context: CommandContext,
  data: RecipeInput & {
    id?: number
    baseRevision?: number
    baseUpdatedAt?: string
  },
) {
  const { tx } = context
  assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
  const method = tx.get('brewingMethods', data.brewingMethodId)
  const parameters = z.array(z.string()).parse(method.enabledParameters)
  const current = data.id ? tx.get('recipes', data.id) : null
  if (current) checkRevision(current, data)
  assertLocalDrinkSelection(
    tx,
    data.drinkTypeId,
    data.drinkOptionValueIds ?? [],
    method.id,
  )
  const values = {
    ...projectShotParameters(data, parameters),
    name: data.name,
    brewingMethodId: method.id,
    beanId: data.beanId ?? null,
    drinkTypeId: data.drinkTypeId ?? null,
  }
  const saved = current
    ? tx.update('recipes', current.id, {
        ...values,
        revision: current.revision + 1,
      })
    : tx.insert('recipes', {
        ...values,
        clientOperationId: data.clientOperationId ?? null,
      })
  if (data.drinkOptionValueIds)
    replaceLinks(
      tx,
      'recipeDrinkOptions',
      'recipeId',
      saved.id,
      [...new Set(data.drinkOptionValueIds)].map((optionValueId) => ({
        recipeId: saved.id,
        optionValueId,
      })),
    )
  replaceLinks(
    tx,
    'recipeAccessoryGear',
    'recipeId',
    saved.id,
    projectAccessoryGearIds(data, parameters).map((gearId) => ({
      recipeId: saved.id,
      gearId,
    })),
  )
  return saved
}
function recipeFromBrew(
  context: CommandContext,
  shot: JournalRow<'shots'>,
  target: z.infer<typeof recipeTargetSchema>,
) {
  const { tx } = context
  const existing = target.recipeId ? tx.get('recipes', target.recipeId) : null
  if (existing && existing.brewingMethodId !== shot.brewingMethodId)
    throw new Error('Recipe does not use this brew’s brewing method')
  return saveRecipe(
    context,
    recipeCreateSchema.extend({ id: positiveIdSchema.optional() }).parse({
      ...shot,
      clientOperationId: undefined,
      name: existing?.name ?? target.name ?? '',
      id: existing?.id,
      accessoryGearIds: tx
        .rows('shotAccessoryGear')
        .filter((row) => row.shotId === shot.id)
        .map((row) => row.gearId),
      drinkOptionValueIds: tx
        .rows('shotDrinkOptions')
        .filter((row) => row.shotId === shot.id)
        .map((row) => row.optionValueId),
    }),
  )
}
function remove(
  context: CommandContext,
  table: 'shots' | 'recipes',
  input: z.infer<typeof deleteRecordSchema>,
) {
  const data = typeof input === 'number' ? { id: input } : input
  const current = context.tx.rows(table).find((row) => row.id === data.id)
  if (!current && data.idempotent) return
  if (!current) throw new Error('Record not found')
  checkRevision(current, data)
  context.tx.delete(table, data.id)
}
export const brewCommands = {
  'shots/createShot': defineCommand(shotCreateSchema, saveBrew),
  'shots/updateShot': defineCommand(shotUpdateSchema, saveBrew),
  'shots/deleteShot': defineCommand(deleteRecordSchema, (context, data) =>
    remove(context, 'shots', data),
  ),
  'shots/createShotAndSaveRecipe': defineCommand(
    z.object({ shot: shotCreateSchema, target: recipeTargetSchema }),
    (context, data) => {
      const shot = saveBrew(context, data.shot)
      return { shot, recipe: recipeFromBrew(context, shot, data.target) }
    },
  ),
  'recipes/createRecipe': defineCommand(recipeCreateSchema, saveRecipe),
  'recipes/updateRecipe': defineCommand(recipeUpdateSchema, saveRecipe),
  'recipes/deleteRecipe': defineCommand(deleteRecordSchema, (context, data) =>
    remove(context, 'recipes', data),
  ),
  'recipes/duplicateRecipe': defineCommand(positiveIdSchema, (context, id) => {
    const recipe = context.tx.get('recipes', id)
    return saveRecipe(
      context,
      recipeCreateSchema.extend({ id: positiveIdSchema.optional() }).parse({
        ...recipe,
        clientOperationId: undefined,
        id: undefined,
        name: `${recipe.name} (copy)`,
        accessoryGearIds: context.tx
          .rows('recipeAccessoryGear')
          .filter((row) => row.recipeId === id)
          .map((row) => row.gearId),
        drinkOptionValueIds: context.tx
          .rows('recipeDrinkOptions')
          .filter((row) => row.recipeId === id)
          .map((row) => row.optionValueId),
      }),
    )
  }),
  'recipes/saveShotAsRecipe': defineCommand(
    shotRecipeTargetSchema,
    (context, data) =>
      recipeFromBrew(context, context.tx.get('shots', data.shotId), data),
  ),
}
