import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, inArray, or } from "drizzle-orm"
import { db } from "@/db"
import { recipeGear, recipes, shots, shotTasteTags } from "@/db/schema"
import {
  assertValidUpdate,
  getShotUpdateErrors,
  type ShotUpdateCandidate,
} from "@/lib/update-validation"

type ShotCreateCandidate = Omit<ShotUpdateCandidate, "id">

const shotRelations = {
  bean: true,
  machine: true,
  recipe: {
    with: {
      bean: true,
      grinder: true,
      basket: true,
      enabledFields: true,
      gear: { with: { gear: true } },
    },
  },
  tasteTags: { with: { tasteTag: true } },
  images: true,
} as const

const shotRelationsWithBeanImages = {
  ...shotRelations,
  bean: { with: { images: true } },
} as const

export const getShots = createServerFn({ method: "GET" }).handler(async () =>
  db.query.shots.findMany({
    orderBy: [desc(shots.createdAt)],
    with: shotRelationsWithBeanImages,
  }),
)

export const getShot = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) =>
    db.query.shots.findFirst({
      where: eq(shots.id, id),
      with: shotRelations,
    }),
  )

export const createShot = createServerFn({ method: "POST" })
  .validator((data: ShotCreateCandidate) => {
    assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
    return data
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { tasteTagIds, ...shotData } = data
      const [shot] = await tx.insert(shots).values(shotData).returning()
      if (!shot) return null

      if (tasteTagIds && tasteTagIds.length > 0) {
        await tx.insert(shotTasteTags).values(
          [...new Set(tasteTagIds)].map((tasteTagId) => ({
            shotId: shot.id,
            tasteTagId,
          })),
        )
      }
      return shot
    }),
  )

export const updateShot = createServerFn({ method: "POST" })
  .validator((data: ShotUpdateCandidate) => {
    assertValidUpdate(getShotUpdateErrors(data))
    return data
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { id, tasteTagIds, ...values } = data
      const [shot] = await tx
        .update(shots)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(shots.id, id))
        .returning()

      if (tasteTagIds !== undefined) {
        await tx.delete(shotTasteTags).where(eq(shotTasteTags.shotId, id))
        if (tasteTagIds.length > 0) {
          await tx.insert(shotTasteTags).values(
            [...new Set(tasteTagIds)].map((tasteTagId) => ({
              shotId: id,
              tasteTagId,
            })),
          )
        }
      }
      return shot
    }),
  )

export const deleteShot = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(shots).where(eq(shots.id, id))
  })

export const getPreviousShotBySetup = createServerFn({ method: "GET" })
  .validator(
    (data: {
      readonly beanId?: number
      readonly recipeId?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const conditions = []
    if (data.beanId) conditions.push(eq(shots.beanId, data.beanId))
    if (data.recipeId) conditions.push(eq(shots.recipeId, data.recipeId))
    if (conditions.length === 0) return null

    return db.query.shots.findFirst({
      where: and(...conditions),
      orderBy: [desc(shots.createdAt)],
    })
  })

export const getPrefillRecipe = createServerFn({ method: "GET" })
  .validator((beanId: number | null) => beanId)
  .handler(async ({ data: beanId }) => {
    if (beanId) {
      const [lastShotForBean] = await db
        .select({ recipeId: shots.recipeId })
        .from(shots)
        .innerJoin(recipes, eq(shots.recipeId, recipes.id))
        .where(and(eq(shots.beanId, beanId), eq(recipes.isArchived, false)))
        .orderBy(desc(shots.createdAt))
        .limit(1)
      if (lastShotForBean) return lastShotForBean.recipeId
    }

    const [lastShot] = await db
      .select({ recipeId: shots.recipeId })
      .from(shots)
      .innerJoin(recipes, eq(shots.recipeId, recipes.id))
      .where(eq(recipes.isArchived, false))
      .orderBy(desc(shots.createdAt))
      .limit(1)
    return lastShot?.recipeId ?? null
  })

export const getShotsByBean = createServerFn({ method: "GET" })
  .validator((beanId: number) => beanId)
  .handler(async ({ data: beanId }) =>
    db.query.shots.findMany({
      where: eq(shots.beanId, beanId),
      orderBy: [desc(shots.createdAt)],
      with: shotRelations,
    }),
  )

export const getShotsByGear = createServerFn({ method: "GET" })
  .validator((gearId: number) => gearId)
  .handler(async ({ data: gearId }) => {
    const linkedRecipes = await db.query.recipeGear.findMany({
      where: eq(recipeGear.gearId, gearId),
    })
    const recipeIds = linkedRecipes.map(({ recipeId }) => recipeId)
    const recipeCondition =
      recipeIds.length > 0 ? inArray(shots.recipeId, recipeIds) : undefined

    return db.query.shots.findMany({
      where: recipeCondition
        ? or(eq(shots.machineId, gearId), recipeCondition)
        : eq(shots.machineId, gearId),
      orderBy: [desc(shots.createdAt)],
      with: shotRelations,
    })
  })
