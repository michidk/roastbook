import { and, asc, count, desc, eq, exists, or } from 'drizzle-orm'
import { z } from 'zod'
import { beans, brewingMethods, clientOperations, recipes } from '@/db/schema'
import { withAccessoryGearIds } from '@/journal/domain/accessory-gear'
import {
  assertDrinkSelection,
  assertDrinkTypeAvailableForBrewingMethod,
} from '@/journal/domain/drink-options'
import { caseInsensitiveLike } from '@/journal/domain/portable-query'
import { prepareRecipeWrite } from '@/journal/domain/recipe-mutations'
import { matchesRevision } from '@/journal/domain/revision'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/journal/domain/shot-parameter-projection'
import { prepareShotToRecipe } from '@/journal/domain/shot-recipes'
import { journalRead, journalWrite } from '@/journal/function'
import { db, owned, runJournalMutations } from '@/journal/platform/database'
import { escapedContainsPattern } from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { getPaginationWindow } from '@/lib/pagination'
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/recipe-input'
import { shotRecipeTargetSchema } from '@/lib/recipe-target'
import { deleteRecordSchema, positiveIdSchema } from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'

type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>
type RecipeCreateInput = z.infer<typeof recipeCreateSchema>
type RecipeInput = RecipeUpdateInput | RecipeCreateInput
type RecipeTransaction = Pick<typeof db, 'query'>

class RecipeInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecipeInputError'
  }
}

function validateRecipeInput<Output extends RecipeInput>(
  schema: { readonly parse: (input: unknown) => Output },
  input: unknown,
): Output {
  const data = schema.parse(input)
  assertValidUpdate(getShotUpdateErrors(data))
  return data
}

async function getBrewingMethod(
  tx: RecipeTransaction,
  brewingMethodId: number,
) {
  const method = await tx.query.brewingMethods.findFirst({
    where: owned(brewingMethods, eq(brewingMethods.id, brewingMethodId)),
  })
  if (!method) throw new RecipeInputError('Brewing method not found')
  return method
}

function projectRecipeWrite(
  data: RecipeCreateInput,
  enabledParameters: readonly string[],
) {
  const {
    name,
    brewingMethodId,
    beanId,
    drinkTypeId,
    drinkOptionValueIds: _drinkOptionValueIds,
    clientOperationId: _clientOperationId,
    ...parameters
  } = data
  return {
    values: {
      name,
      brewingMethodId,
      beanId,
      drinkTypeId,
      ...projectShotParameters(parameters, enabledParameters),
      updatedAt: new Date(),
    },
    accessoryGearIds: projectAccessoryGearIds(parameters, enabledParameters),
  }
}

const recipeRelations = {
  bean: { with: { images: true, roasterRef: true } },
  drinkType: true,
  drinkOptions: { with: { optionValue: true } },
  machine: true,
  grinder: true,
  basket: true,
  brewingMethod: true,
  accessoryGearLinks: { columns: { gearId: true } },
} as const

const RECIPES_PAGE_SIZE = 24
const recipeListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['name', 'updated']).default('updated'),
  direction: z.enum(['asc', 'desc']).default('desc'),
})

export const getRecipes = journalRead('recipes/getRecipes').handler(
  async () => {
    const results = await db.query.recipes.findMany({
      where: owned(recipes),
      orderBy: [desc(recipes.updatedAt)],
      with: recipeRelations,
    })
    return results.map(withAccessoryGearIds)
  },
)

export const getRecipeOptions = journalRead('recipes/getRecipeOptions').handler(
  async () =>
    db.query.recipes.findMany({
      where: owned(recipes),
      columns: { id: true, name: true, brewingMethodId: true },
      orderBy: [asc(recipes.name), asc(recipes.id)],
    }),
)

export const getRecipePage = journalRead('recipes/getRecipePage')
  .validator(recipeListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const where = data.query
      ? or(
          caseInsensitiveLike(recipes.name, pattern),
          exists(
            db
              .select({ id: beans.id })
              .from(beans)
              .where(
                owned(
                  beans,
                  and(
                    eq(beans.id, recipes.beanId),
                    caseInsensitiveLike(beans.name, pattern),
                  ),
                ),
              ),
          ),
          exists(
            db
              .select({ id: brewingMethods.id })
              .from(brewingMethods)
              .where(
                owned(
                  brewingMethods,
                  and(
                    eq(brewingMethods.id, recipes.brewingMethodId),
                    caseInsensitiveLike(brewingMethods.name, pattern),
                  ),
                ),
              ),
          ),
        )
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(recipes)
      .where(owned(recipes, where))
    const totalItems = countRows[0]?.value ?? 0
    const { offset, ...pagination } = getPaginationWindow(
      totalItems,
      data.page,
      RECIPES_PAGE_SIZE,
    )
    const sortColumn = data.sort === 'name' ? recipes.name : recipes.updatedAt
    const order = data.direction === 'asc' ? asc(sortColumn) : desc(sortColumn)
    const items = await db.query.recipes.findMany({
      where: owned(recipes, where),
      orderBy: [order, asc(recipes.id)],
      limit: pagination.pageSize,
      offset,
      with: recipeRelations,
    })

    return { items, ...pagination }
  })

export const getRecipe = journalRead('recipes/getRecipe')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const recipe = await db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.id, id)),
      with: recipeRelations,
    })
    return recipe ? withAccessoryGearIds(recipe) : undefined
  })

/*
 * Recipe and shot form contracts continue to expose accessoryGearIds. The
 * persistence boundary above/below translates that stable API to normalized
 * association rows, keeping storage details out of route components.
 */

async function completedRecipe(operationId?: string) {
  if (!operationId) return undefined
  const operation = await db.query.clientOperations.findFirst({
    where: owned(
      clientOperations,
      eq(clientOperations.operationId, operationId),
    ),
  })
  if (!operation) return undefined
  const recipe = operation.recipeId
    ? await db.query.recipes.findFirst({
        where: owned(recipes, eq(recipes.id, operation.recipeId)),
      })
    : undefined
  if (!recipe)
    throw new RecipeInputError('This recipe was already synced and deleted')
  return recipe
}

async function executeRecipePlan(
  plan: Awaited<ReturnType<typeof prepareRecipeWrite>>,
  operationId?: string,
) {
  try {
    await runJournalMutations(plan.mutations)
  } catch (error) {
    const completed = await completedRecipe(operationId)
    if (completed) return completed
    throw error
  }
  return expectReturnedRow(
    await db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.id, plan.id)),
    }),
    'Recipe',
  )
}

async function validateRecipeSelection(data: RecipeCreateInput) {
  const method = await getBrewingMethod(db, data.brewingMethodId)
  await assertDrinkSelection(db, data.drinkTypeId, data.drinkOptionValueIds)
  await assertDrinkTypeAvailableForBrewingMethod(
    db,
    data.brewingMethodId,
    data.drinkTypeId,
  )
  return projectRecipeWrite(data, method.enabledParameters)
}

export const updateRecipe = journalWrite('recipes/updateRecipe')
  .validator((input: z.input<typeof recipeUpdateSchema>) =>
    validateRecipeInput(recipeUpdateSchema, input),
  )
  .handler(async ({ data }) => {
    const completed = await completedRecipe(data.clientOperationId)
    if (completed) return completed
    const existing = await db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.id, data.id)),
    })
    if (!existing) throw new RecipeInputError('Recipe not found')
    if (
      (data.baseRevision !== undefined &&
        existing.revision !== data.baseRevision) ||
      (data.baseRevision === undefined &&
        data.baseUpdatedAt &&
        existing.updatedAt.toISOString() !== data.baseUpdatedAt)
    )
      throw new RecipeInputError(
        'This recipe changed on the server. Reload and try again.',
      )
    const projected = await validateRecipeSelection(data)
    const plan = await prepareRecipeWrite({
      values: projected.values,
      existing,
      accessoryGearIds: projected.accessoryGearIds,
      drinkOptionValueIds: data.drinkOptionValueIds ?? [],
      operationId: data.clientOperationId,
    })
    return executeRecipePlan(plan, data.clientOperationId)
  })

export const createRecipe = journalWrite('recipes/createRecipe')
  .validator((input: z.input<typeof recipeCreateSchema>) =>
    validateRecipeInput(recipeCreateSchema, input),
  )
  .handler(async ({ data }) => {
    const completed = await completedRecipe(data.clientOperationId)
    if (completed) return completed
    const projected = await validateRecipeSelection(data)
    const plan = await prepareRecipeWrite({
      values: projected.values,
      accessoryGearIds: projected.accessoryGearIds,
      drinkOptionValueIds: data.drinkOptionValueIds ?? [],
      operationId: data.clientOperationId,
    })
    return executeRecipePlan(plan, data.clientOperationId)
  })

export const saveShotAsRecipe = journalWrite('recipes/saveShotAsRecipe')
  .validator(shotRecipeTargetSchema)
  .handler(async ({ data }) => {
    const completed = await completedRecipe(data.clientOperationId)
    if (completed) return completed
    const plan = await prepareShotToRecipe(
      data.shotId,
      data,
      data.clientOperationId,
    )
    return executeRecipePlan(plan, data.clientOperationId)
  })

export const deleteRecipe = journalWrite('recipes/deleteRecipe')
  .validator((input: z.input<typeof deleteRecordSchema>) => {
    const data = deleteRecordSchema.parse(input)
    return typeof data === 'number' ? { id: data } : data
  })
  .handler(async ({ data }) => {
    const existing = await db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.id, data.id)),
    })
    if (!existing) {
      if (data.idempotent) return
      throw new RecipeInputError('Recipe not found')
    }
    await runJournalMutations([
      {
        statement: db
          .delete(recipes)
          .where(
            owned(
              recipes,
              and(
                eq(recipes.id, data.id),
                eq(recipes.revision, existing.revision),
                data.baseRevision !== undefined
                  ? eq(recipes.revision, data.baseRevision)
                  : matchesRevision(recipes.updatedAt, data.baseUpdatedAt),
              ),
            ),
          )
          .getSQL(),
        expectedChanges: 1,
        conflictMessage:
          'This recipe changed on the server. Reload and try again.',
      },
    ])
  })
