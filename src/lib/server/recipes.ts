import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, exists, ilike, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, brewingMethods, recipes } from '@/db/schema'
import { escapedContainsPattern } from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { getPaginationWindow } from '@/lib/pagination'
import { shotRecipeTargetSchema } from '@/lib/recipe-target'
import {
  replaceRecipeAccessoryGear,
  withAccessoryGearIds,
} from '@/lib/server/accessory-gear.server'
import {
  assertDrinkSelection,
  assertDrinkTypeAvailableForBrewingMethod,
  replaceRecipeDrinkOptions,
} from '@/lib/server/drink-options.server'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/lib/server/shot-parameter-projection'
import { saveShotToRecipeInTransaction } from '@/lib/server/shot-recipes.server'
import {
  deleteRecordSchema,
  nameSchema,
  positiveIdSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'

const recipeUpdateSchema = shotUpdateSchema
  .omit({
    brewedAt: true,
    rating: true,
    bitterness: true,
    acidity: true,
    sweetness: true,
    body: true,
    astringency: true,
    notes: true,
    tasteTagIds: true,
  })
  .extend({ name: nameSchema })
const recipeCreateSchema = recipeUpdateSchema
  .omit({
    id: true,
    baseUpdatedAt: true,
  })
  .extend({ clientOperationId: z.uuid().optional() })
type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>
type RecipeCreateInput = z.infer<typeof recipeCreateSchema>
type RecipeInput = RecipeUpdateInput | RecipeCreateInput
type RecipeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

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
    where: eq(brewingMethods.id, brewingMethodId),
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

export const getRecipes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const results = await db.query.recipes.findMany({
      orderBy: [desc(recipes.updatedAt)],
      with: recipeRelations,
    })
    return results.map(withAccessoryGearIds)
  },
)

export const getRecipeOptions = createServerFn({ method: 'GET' }).handler(
  async () =>
    db.query.recipes.findMany({
      columns: { id: true, name: true, brewingMethodId: true },
      orderBy: [asc(recipes.name), asc(recipes.id)],
    }),
)

export const getRecipePage = createServerFn({ method: 'GET' })
  .validator(recipeListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const where = data.query
      ? or(
          ilike(recipes.name, pattern),
          exists(
            db
              .select({ id: beans.id })
              .from(beans)
              .where(
                and(eq(beans.id, recipes.beanId), ilike(beans.name, pattern)),
              ),
          ),
          exists(
            db
              .select({ id: brewingMethods.id })
              .from(brewingMethods)
              .where(
                and(
                  eq(brewingMethods.id, recipes.brewingMethodId),
                  ilike(brewingMethods.name, pattern),
                ),
              ),
          ),
        )
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(recipes)
      .where(where)
    const totalItems = countRows[0]?.value ?? 0
    const { offset, ...pagination } = getPaginationWindow(
      totalItems,
      data.page,
      RECIPES_PAGE_SIZE,
    )
    const sortColumn = data.sort === 'name' ? recipes.name : recipes.updatedAt
    const order = data.direction === 'asc' ? asc(sortColumn) : desc(sortColumn)
    const items = await db.query.recipes.findMany({
      where,
      orderBy: [order, asc(recipes.id)],
      limit: pagination.pageSize,
      offset,
      with: recipeRelations,
    })

    return { items, ...pagination }
  })

export const getRecipe = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: recipeRelations,
    })
    return recipe ? withAccessoryGearIds(recipe) : undefined
  })

/*
 * Recipe and shot form contracts continue to expose accessoryGearIds. The
 * persistence boundary above/below translates that stable API to normalized
 * association rows, keeping storage details out of route components.
 */

export const updateRecipe = createServerFn({ method: 'POST' })
  .validator((input: unknown) => validateRecipeInput(recipeUpdateSchema, input))
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const method = await getBrewingMethod(tx, data.brewingMethodId)
      await assertDrinkSelection(tx, data.drinkTypeId, data.drinkOptionValueIds)
      await assertDrinkTypeAvailableForBrewingMethod(
        tx,
        data.brewingMethodId,
        data.drinkTypeId,
      )
      const { id, baseUpdatedAt, ...input } = data
      const existingRecipe = await tx.query.recipes.findFirst({
        columns: { updatedAt: true },
        where: eq(recipes.id, id),
      })
      if (!existingRecipe) throw new RecipeInputError('Recipe not found')
      if (
        baseUpdatedAt &&
        existingRecipe.updatedAt.toISOString() !== baseUpdatedAt
      ) {
        throw new RecipeInputError(
          'This recipe changed on the server. Reload and try again.',
        )
      }
      const projected = projectRecipeWrite(input, method.enabledParameters)
      const [recipe] = await tx
        .update(recipes)
        .set(projected.values)
        .where(eq(recipes.id, id))
        .returning()
      const persistedRecipe = expectReturnedRow(recipe, 'Recipe')
      await replaceRecipeAccessoryGear(tx, id, projected.accessoryGearIds)
      await replaceRecipeDrinkOptions(
        tx,
        persistedRecipe.id,
        data.drinkOptionValueIds ?? [],
      )
      return persistedRecipe
    }),
  )

export const createRecipe = createServerFn({ method: 'POST' })
  .validator((input: unknown) => validateRecipeInput(recipeCreateSchema, input))
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const operationId = data.clientOperationId
      if (operationId) {
        const existing = await tx.query.recipes.findFirst({
          where: eq(recipes.clientOperationId, operationId),
        })
        if (existing) return existing
      }

      const method = await getBrewingMethod(tx, data.brewingMethodId)
      await assertDrinkSelection(tx, data.drinkTypeId, data.drinkOptionValueIds)
      await assertDrinkTypeAvailableForBrewingMethod(
        tx,
        data.brewingMethodId,
        data.drinkTypeId,
      )
      const projected = projectRecipeWrite(data, method.enabledParameters)
      const [recipe] = await tx
        .insert(recipes)
        .values({
          ...projected.values,
          clientOperationId: operationId ?? null,
        })
        .onConflictDoNothing({ target: recipes.clientOperationId })
        .returning()
      if (!recipe) {
        const existing = operationId
          ? await tx.query.recipes.findFirst({
              where: eq(recipes.clientOperationId, operationId),
            })
          : undefined
        if (existing) return existing
        throw new RecipeInputError('Could not create recipe')
      }
      const persistedRecipe = expectReturnedRow(recipe, 'Recipe')
      await replaceRecipeAccessoryGear(
        tx,
        persistedRecipe.id,
        projected.accessoryGearIds,
      )
      await replaceRecipeDrinkOptions(
        tx,
        persistedRecipe.id,
        data.drinkOptionValueIds ?? [],
      )
      return persistedRecipe
    }),
  )

export const duplicateRecipe = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.transaction(async (tx) => {
      const source = await tx.query.recipes.findFirst({
        where: eq(recipes.id, id),
        with: {
          accessoryGearLinks: { columns: { gearId: true } },
          drinkOptions: true,
        },
      })
      if (!source) throw new RecipeInputError('Recipe not found')

      const { accessoryGearLinks, drinkOptions, ...sourceRecipe } = source
      const {
        id: _sourceId,
        createdAt: _sourceCreatedAt,
        updatedAt: _sourceUpdatedAt,
        ...recipeValues
      } = sourceRecipe
      const [duplicate] = await tx
        .insert(recipes)
        .values({
          ...recipeValues,
          name: `${source.name} copy`,
          updatedAt: new Date(),
        })
        .returning()
      const persistedRecipe = expectReturnedRow(duplicate, 'Recipe')
      await replaceRecipeAccessoryGear(
        tx,
        persistedRecipe.id,
        accessoryGearLinks.map(({ gearId }) => gearId),
      )
      await replaceRecipeDrinkOptions(
        tx,
        persistedRecipe.id,
        drinkOptions.map(({ optionValueId }) => optionValueId),
      )
      return persistedRecipe
    }),
  )

export const saveShotAsRecipe = createServerFn({ method: 'POST' })
  .validator(shotRecipeTargetSchema)
  .handler(async ({ data }) =>
    db.transaction((tx) =>
      saveShotToRecipeInTransaction(tx, data.shotId, data),
    ),
  )

export const deleteRecipe = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = deleteRecordSchema.parse(input)
    return typeof data === 'number' ? { id: data } : data
  })
  .handler(async ({ data }) => {
    const existing = await db.query.recipes.findFirst({
      columns: { id: true, updatedAt: true },
      where: eq(recipes.id, data.id),
    })
    if (!existing) {
      if (data.idempotent) return
      throw new RecipeInputError('Recipe not found')
    }
    if (
      data.baseUpdatedAt &&
      existing.updatedAt.toISOString() !== data.baseUpdatedAt
    ) {
      throw new RecipeInputError(
        'This recipe changed on the server. Reload and try again.',
      )
    }

    const [recipe] = await db
      .delete(recipes)
      .where(eq(recipes.id, data.id))
      .returning({ id: recipes.id })
    expectReturnedRow(recipe, 'Recipe')
  })
