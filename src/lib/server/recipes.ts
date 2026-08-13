import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { recipes, shots } from '@/db/schema'
import { projectShotParameters } from '@/lib/server/shot-parameter-projection'
import {
  assertValidUpdate,
  getShotUpdateErrors,
  type ShotUpdateCandidate,
} from '@/lib/update-validation'

type RecipeUpdate = Omit<
  ShotUpdateCandidate,
  'rating' | 'notes' | 'tasteTagIds'
> & {
  readonly name: string
  readonly beanId: number | null
}

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
  .validator((id: number) => id)
  .handler(async ({ data: id }) =>
    db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: recipeRelations,
    }),
  )

export const updateRecipe = createServerFn({ method: 'POST' })
  .validator((data: RecipeUpdate) => {
    const name = data.name.trim()
    if (!name) throw new RecipeInputError('Enter a recipe name')
    assertValidUpdate(getShotUpdateErrors(data))
    return { ...data, name }
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
      if (!recipe) throw new RecipeInputError('Recipe not found')
      return recipe
    }),
  )

export const saveShotAsRecipe = createServerFn({ method: 'POST' })
  .validator((data: { readonly shotId: number; readonly name: string }) => ({
    shotId: data.shotId,
    name: data.name.trim(),
  }))
  .handler(async ({ data }) => {
    if (!data.name) return null
    const shot = await db.query.shots.findFirst({
      where: eq(shots.id, data.shotId),
      with: { brewingMethod: true },
    })
    if (!shot) return null

    const [recipe] = await db
      .insert(recipes)
      .values({
        name: data.name,
        brewingMethodId: shot.brewingMethodId,
        beanId: shot.beanId,
        ...projectShotParameters(shot, shot.brewingMethod.enabledParameters),
      })
      .returning()
    return recipe ?? null
  })

export const deleteRecipe = createServerFn({ method: 'POST' })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(recipes).where(eq(recipes.id, id))
  })
