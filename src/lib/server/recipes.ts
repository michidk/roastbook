import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { recipes, shots } from '@/db/schema'
import { expectReturnedRow, notFound } from '@/lib/domain-errors'
import { projectShotParameters } from '@/lib/server/shot-parameter-projection'
import {
  nameSchema,
  positiveIdSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'

const recipeUpdateSchema = shotUpdateSchema
  .omit({ rating: true, notes: true, tasteTagIds: true })
  .extend({ name: nameSchema })

const saveShotAsRecipeSchema = z.object({
  shotId: positiveIdSchema,
  name: nameSchema,
})

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
} as const

export const getRecipes = createServerFn({ method: 'GET' }).handler(async () =>
  db.query.recipes.findMany({
    orderBy: [desc(recipes.updatedAt)],
    with: recipeRelations,
  }),
)

export const getRecipe = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: recipeRelations,
    }),
  )

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
      return expectReturnedRow(recipe, 'Recipe')
    }),
  )

export const saveShotAsRecipe = createServerFn({ method: 'POST' })
  .validator(saveShotAsRecipeSchema)
  .handler(async ({ data }) => {
    const shot = await db.query.shots.findFirst({
      where: eq(shots.id, data.shotId),
      with: { brewingMethod: true },
    })
    if (!shot) throw notFound('Shot')

    const [recipe] = await db
      .insert(recipes)
      .values({
        name: data.name,
        brewingMethodId: shot.brewingMethodId,
        beanId: shot.beanId,
        ...projectShotParameters(shot, shot.brewingMethod.enabledParameters),
      })
      .returning()
    return expectReturnedRow(recipe, 'Recipe')
  })

export const deleteRecipe = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [recipe] = await db
      .delete(recipes)
      .where(eq(recipes.id, id))
      .returning({ id: recipes.id })
    expectReturnedRow(recipe, 'Recipe')
  })
