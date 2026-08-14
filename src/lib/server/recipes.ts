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
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/lib/server/shot-parameter-projection'
import { saveShotToRecipeInTransaction } from '@/lib/server/shot-recipes.server'
import {
  nameSchema,
  positiveIdSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'

const recipeUpdateSchema = shotUpdateSchema
  .omit({
    brewedAt: true,
    recipeId: true,
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

class RecipeInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecipeInputError'
  }
}

const recipeRelations = {
  bean: { with: { images: true, roasterRef: true } },
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
  .validator((input: unknown) => {
    const data = recipeUpdateSchema.parse(input)
    assertValidUpdate(getShotUpdateErrors(data))
    return data
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const method = await tx.query.brewingMethods.findFirst({
        where: (brewingMethods, { eq }) =>
          eq(brewingMethods.id, data.brewingMethodId),
      })
      if (!method) throw new RecipeInputError('Brewing method not found')

      const { id, name, brewingMethodId, beanId, ...parameters } = data
      const [recipe] = await tx
        .update(recipes)
        .set({
          name,
          brewingMethodId,
          beanId,
          ...projectShotParameters(parameters, method.enabledParameters),
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, id))
        .returning()
      const persistedRecipe = expectReturnedRow(recipe, 'Recipe')
      await replaceRecipeAccessoryGear(
        tx,
        id,
        projectAccessoryGearIds(parameters, method.enabledParameters),
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
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [recipe] = await db
      .delete(recipes)
      .where(eq(recipes.id, id))
      .returning({ id: recipes.id })
    expectReturnedRow(recipe, 'Recipe')
  })
