import { createServerFn } from "@tanstack/react-start"
import { asc, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { recipeEnabledFields, recipeGear, recipes } from "@/db/schema"
import {
  isRecipeFieldKey,
  type RecipeFieldKey,
  type RecipeValues,
} from "@/lib/recipe-fields"

export type RecipeMutation = RecipeValues & {
  readonly accessoryIds: readonly number[]
}

const recipeRelations = {
  bean: true,
  grinder: true,
  basket: true,
  enabledFields: true,
  gear: { with: { gear: true } },
} as const

function toRecipeRow(data: RecipeValues) {
  const { enabledFields: _enabledFields, ...values } = data
  return values
}

async function replaceRecipeRelations(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  recipeId: number,
  enabledFields: readonly RecipeFieldKey[],
  accessoryIds: readonly number[],
) {
  await tx
    .delete(recipeEnabledFields)
    .where(eq(recipeEnabledFields.recipeId, recipeId))
  await tx.delete(recipeGear).where(eq(recipeGear.recipeId, recipeId))

  if (enabledFields.length > 0) {
    await tx.insert(recipeEnabledFields).values(
      [...new Set(enabledFields)].map((fieldKey) => ({ recipeId, fieldKey })),
    )
  }
  if (accessoryIds.length > 0) {
    await tx.insert(recipeGear).values(
      [...new Set(accessoryIds)].map((gearId) => ({ recipeId, gearId })),
    )
  }
}

export const getAllRecipes = createServerFn({ method: "GET" }).handler(
  async () =>
    db.query.recipes.findMany({
      orderBy: [asc(recipes.isArchived), desc(recipes.updatedAt)],
      with: recipeRelations,
    }),
)

export const getRecipes = createServerFn({ method: "GET" }).handler(async () =>
  db.query.recipes.findMany({
    where: eq(recipes.isArchived, false),
    orderBy: [desc(recipes.updatedAt)],
    with: recipeRelations,
  }),
)

export const getRecipe = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) =>
    db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: recipeRelations,
    }),
  )

export const createRecipe = createServerFn({ method: "POST" })
  .validator((data: RecipeMutation) => data)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { accessoryIds, ...recipeValues } = data
      const [recipe] = await tx
        .insert(recipes)
        .values(toRecipeRow(recipeValues))
        .returning()
      if (!recipe) return null
      await replaceRecipeRelations(
        tx,
        recipe.id,
        data.enabledFields,
        accessoryIds,
      )
      return recipe
    }),
  )

export const updateRecipe = createServerFn({ method: "POST" })
  .validator((data: RecipeMutation & { readonly id: number }) => data)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { id, accessoryIds, ...recipeValues } = data
      const [recipe] = await tx
        .update(recipes)
        .set({ ...toRecipeRow(recipeValues), updatedAt: new Date() })
        .where(eq(recipes.id, id))
        .returning()
      if (!recipe) return null
      await replaceRecipeRelations(tx, id, data.enabledFields, accessoryIds)
      return recipe
    }),
  )

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
  .handler(async ({ data: id }) =>
    db.transaction(async (tx) => {
      const source = await tx.query.recipes.findFirst({
        where: eq(recipes.id, id),
        with: recipeRelations,
      })
      if (!source) return null

      const [copy] = await tx
        .insert(recipes)
        .values({
          name: `${source.name} copy`,
          brewingMethod: source.brewingMethod,
          beanId: source.beanId,
          targetDoseGrams: source.targetDoseGrams,
          brewWaterGrams: source.brewWaterGrams,
          ratioBasis: source.ratioBasis,
          grinderId: source.grinderId,
          grindSetting: source.grindSetting,
          targetYieldGrams: source.targetYieldGrams,
          targetTimeMinSeconds: source.targetTimeMinSeconds,
          targetTimeMaxSeconds: source.targetTimeMaxSeconds,
          brewTemperatureCelsius: source.brewTemperatureCelsius,
          preinfusionTimeSeconds: source.preinfusionTimeSeconds,
          preinfusionPressureBar: source.preinfusionPressureBar,
          bloomTimeSeconds: source.bloomTimeSeconds,
          targetBrewPressureBar: source.targetBrewPressureBar,
          targetFlowRateMlPerSecond: source.targetFlowRateMlPerSecond,
          basketId: source.basketId,
          usesPuckScreen: source.usesPuckScreen,
          paperFilterPosition: source.paperFilterPosition,
          distributionMethod: source.distributionMethod,
          tampForceKg: source.tampForceKg,
          notes: source.notes,
        })
        .returning()
      if (!copy) return null

      await replaceRecipeRelations(
        tx,
        copy.id,
        source.enabledFields
          .map(({ fieldKey }) => fieldKey)
          .filter(isRecipeFieldKey),
        source.gear.map(({ gearId }) => gearId),
      )
      return copy
    }),
  )

export const deleteRecipe = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(recipes).where(eq(recipes.id, id))
  })
