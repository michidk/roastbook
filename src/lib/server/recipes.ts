import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { recipes } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

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

export const createRecipe = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string
      defaultDoseGrams?: string
      defaultYieldGrams?: string
      defaultBrewTimeSeconds?: number
      defaultGrindSetting?: string
      defaultWaterTempCelsius?: string
      defaultPressure?: string
      notes?: string
    }) => data
  )
  .handler(async ({ data }) => {
    const [recipe] = await db
      .insert(recipes)
      .values({ ...data, brewingMethod: "espresso" })
      .returning()
    return recipe
  })
