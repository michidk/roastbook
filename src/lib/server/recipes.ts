import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { recipeGear, recipes } from "@/db/schema"
import { asc, desc, eq } from "drizzle-orm"
import type { BrewingMethod } from "@/lib/recipes"

type RecipeValues = {
  readonly name: string
  readonly brewingMethod: BrewingMethod
  readonly defaultDoseGrams?: string | null
  readonly defaultYieldGrams?: string | null
  readonly defaultBrewTimeSeconds?: number | null
  readonly defaultGrindSetting?: string | null
  readonly defaultWaterTempCelsius?: string | null
  readonly defaultPressure?: string | null
  readonly notes?: string | null
}

export const getAllRecipes = createServerFn({ method: "GET" }).handler(
  async () => {
    return db.query.recipes.findMany({
      orderBy: [asc(recipes.isArchived), desc(recipes.updatedAt)],
      with: {
        gear: {
          with: {
            gear: true,
          },
        },
      },
    })
  },
)

export const getRecipes = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.recipes.findMany({
    where: eq(recipes.isArchived, false),
    orderBy: [desc(recipes.updatedAt)],
    with: {
      gear: {
        with: {
          gear: true,
        },
      },
    },
  })
})

export const getRecipe = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    return db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        gear: {
          with: {
            gear: true,
          },
        },
      },
    })
  })

export const createRecipe = createServerFn({ method: "POST" })
  .validator((data: RecipeValues) => data)
  .handler(async ({ data }) => {
    const [recipe] = await db.insert(recipes).values(data).returning()
    return recipe
  })

export const updateRecipe = createServerFn({ method: "POST" })
  .validator((data: RecipeValues & { readonly id: number }) => data)
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [recipe] = await db
      .update(recipes)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning()
    return recipe
  })

export const setRecipeArchived = createServerFn({ method: "POST" })
  .validator(
    (data: { readonly id: number; readonly isArchived: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const [recipe] = await db
      .update(recipes)
      .set({ isArchived: data.isArchived, updatedAt: new Date() })
      .where(eq(recipes.id, data.id))
      .returning()
    return recipe
  })

export const duplicateRecipe = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    const source = await getRecipe({ data: id })
    if (!source) return null

    return db.transaction(async (tx) => {
      const [copy] = await tx
        .insert(recipes)
        .values({
          name: `${source.name} copy`,
          brewingMethod: source.brewingMethod,
          defaultDoseGrams: source.defaultDoseGrams,
          defaultYieldGrams: source.defaultYieldGrams,
          defaultBrewTimeSeconds: source.defaultBrewTimeSeconds,
          defaultGrindSetting: source.defaultGrindSetting,
          defaultWaterTempCelsius: source.defaultWaterTempCelsius,
          defaultPressure: source.defaultPressure,
          notes: source.notes,
        })
        .returning()

      if (!copy) return null

      if (source.gear.length > 0) {
        await tx.insert(recipeGear).values(
          source.gear.map(({ gearId }) => ({
            recipeId: copy.id,
            gearId,
          })),
        )
      }

      return copy
    })
  })

export const deleteRecipe = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(recipes).where(eq(recipes.id, id))
  })
