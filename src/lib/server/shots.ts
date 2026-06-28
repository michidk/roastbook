import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { shots, shotTasteTags, recipeGear } from "@/db/schema"
import { eq, desc, and, inArray } from "drizzle-orm"

export const getShots = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.shots.findMany({
    orderBy: [desc(shots.createdAt)],
    with: {
      bean: {
        with: {
          images: true,
        },
      },
      recipe: {
        with: {
          gear: {
            with: {
              gear: true,
            },
          },
        },
      },
      tasteTags: {
        with: {
          tasteTag: true,
        },
      },
      images: true,
    },
  })
})

export const getShot = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    return db.query.shots.findFirst({
      where: eq(shots.id, id),
      with: {
        bean: true,
        recipe: {
          with: {
            gear: {
              with: {
                gear: true,
              },
            },
          },
        },
        tasteTags: {
          with: {
            tasteTag: true,
          },
        },
        images: true,
      },
    })
  })

export const createShot = createServerFn({ method: "POST" })
  .validator(
    (data: {
      beanId?: number
      recipeId?: number
      doseGrams?: string
      yieldGrams?: string
      brewTimeSeconds?: number
      grindSetting?: string
      waterTempCelsius?: string
      pressure?: string
      rating?: number
      notes?: string
      tasteTagIds?: number[]
    }) => data
  )
  .handler(async ({ data }) => {
    const { tasteTagIds, ...shotData } = data
    const [shot] = await db.insert(shots).values(shotData).returning()

    if (tasteTagIds && tasteTagIds.length > 0) {
      await db.insert(shotTasteTags).values(
        tasteTagIds.map((tasteTagId) => ({
          shotId: shot.id,
          tasteTagId,
        }))
      )
    }

    return shot
  })

export const updateShot = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: number
      beanId?: number | null
      recipeId?: number | null
      doseGrams?: string | null
      yieldGrams?: string | null
      brewTimeSeconds?: number | null
      grindSetting?: string | null
      waterTempCelsius?: string | null
      pressure?: string | null
      rating?: number | null
      notes?: string | null
      tasteTagIds?: number[]
    }) => data
  )
  .handler(async ({ data }) => {
    const { id, tasteTagIds, ...values } = data
    const [shot] = await db
      .update(shots)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(shots.id, id))
      .returning()

    if (tasteTagIds !== undefined) {
      await db.delete(shotTasteTags).where(eq(shotTasteTags.shotId, id))
      if (tasteTagIds.length > 0) {
        await db.insert(shotTasteTags).values(
          tasteTagIds.map((tasteTagId) => ({
            shotId: id,
            tasteTagId,
          }))
        )
      }
    }

    return shot
  })

export const deleteShot = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(shots).where(eq(shots.id, id))
  })

export const getPreviousShotBySetup = createServerFn({ method: "GET" })
  .validator(
    (data: {
      beanId?: number
      recipeId?: number
    }) => data
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
      const lastShotForBean = await db.query.shots.findFirst({
        where: eq(shots.beanId, beanId),
        orderBy: [desc(shots.createdAt)],
      })
      if (lastShotForBean?.recipeId) return lastShotForBean.recipeId
    }

    const lastShot = await db.query.shots.findFirst({
      orderBy: [desc(shots.createdAt)],
    })
    return lastShot?.recipeId ?? null
  })

export const getShotsByBean = createServerFn({ method: "GET" })
  .validator((beanId: number) => beanId)
  .handler(async ({ data: beanId }) => {
    return db.query.shots.findMany({
      where: eq(shots.beanId, beanId),
      orderBy: [desc(shots.createdAt)],
      with: {
        bean: true,
        recipe: {
          with: {
            gear: {
              with: {
                gear: true,
              },
            },
          },
        },
        tasteTags: {
          with: {
            tasteTag: true,
          },
        },
        images: true,
      },
    })
  })

export const getShotsByGear = createServerFn({ method: "GET" })
  .validator((gearId: number) => gearId)
  .handler(async ({ data: gearId }) => {
    const linkedRecipes = await db.query.recipeGear.findMany({
      where: eq(recipeGear.gearId, gearId),
    })
    const recipeIds = linkedRecipes.map((rg) => rg.recipeId)

    if (recipeIds.length === 0) return []

    return db.query.shots.findMany({
      where: inArray(shots.recipeId, recipeIds),
      orderBy: [desc(shots.createdAt)],
      with: {
        bean: true,
        recipe: {
          with: {
            gear: {
              with: {
                gear: true,
              },
            },
          },
        },
        tasteTags: {
          with: {
            tasteTag: true,
          },
        },
        images: true,
      },
    })
  })

export const getRecentlyUsedBeans = createServerFn({ method: "GET" }).handler(
  async () => {
    const recentShots = await db.query.shots.findMany({
      orderBy: [desc(shots.createdAt)],
      limit: 20,
      with: {
        bean: true,
      },
    })
    const seen = new Set<number>()
    const recentBeans: { id: number; name: string }[] = []
    for (const shot of recentShots) {
      if (shot.bean && !seen.has(shot.bean.id)) {
        seen.add(shot.bean.id)
        recentBeans.push({ id: shot.bean.id, name: shot.bean.name })
      }
      if (recentBeans.length >= 5) break
    }
    return recentBeans
  }
)
