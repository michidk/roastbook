import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { cafeVisits, cafeVisitTasteTags } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { toDisplayableDatabaseError } from "@/lib/server/database-error"
import {
  assertValidUpdate,
  getCafeVisitUpdateErrors,
  type CafeVisitUpdateCandidate,
} from "@/lib/update-validation"

const cafeVisitRelations = {
  coffeeShop: true,
  bean: true,
  tasteTags: {
    with: {
      tasteTag: true,
    },
  },
  images: true,
} as const

export const getCafeVisits = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      return await db.query.cafeVisits.findMany({
        orderBy: [desc(cafeVisits.visitedAt)],
        with: cafeVisitRelations,
      })
    } catch (error) {
      throw await toDisplayableDatabaseError(error)
    }
  }
)

export const getCafeVisit = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await db.query.cafeVisits.findFirst({
        where: eq(cafeVisits.id, id),
        with: cafeVisitRelations,
      })
    } catch (error) {
      throw await toDisplayableDatabaseError(error)
    }
  })

export const createCafeVisit = createServerFn({ method: "POST" })
  .validator(
    (data: {
      coffeeShopId?: number
      beanId?: number
      drinkName?: string
      drinkType?: string
      price?: string
      currency?: string
      rating?: number
      notes?: string
      visitedAt?: Date
      tasteTagIds?: number[]
    }) => data
  )
  .handler(async ({ data }) => {
    const { tasteTagIds, ...visitData } = data
    const [visit] = await db.insert(cafeVisits).values(visitData).returning()

    if (tasteTagIds && tasteTagIds.length > 0) {
      await db.insert(cafeVisitTasteTags).values(
        tasteTagIds.map((tasteTagId) => ({
          cafeVisitId: visit.id,
          tasteTagId,
        }))
      )
    }

    return visit
  })

export const updateCafeVisit = createServerFn({ method: "POST" })
  .validator((data: CafeVisitUpdateCandidate) => {
    assertValidUpdate(getCafeVisitUpdateErrors(data))
    return data
  })
  .handler(async ({ data }) => {
    const { id, tasteTagIds, ...values } = data
    const [visit] = await db
      .update(cafeVisits)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(cafeVisits.id, id))
      .returning()

    if (tasteTagIds !== undefined) {
      await db
        .delete(cafeVisitTasteTags)
        .where(eq(cafeVisitTasteTags.cafeVisitId, id))
      if (tasteTagIds.length > 0) {
        await db.insert(cafeVisitTasteTags).values(
          tasteTagIds.map((tasteTagId) => ({
            cafeVisitId: id,
            tasteTagId,
          }))
        )
      }
    }

    return visit
  })

export const deleteCafeVisit = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(cafeVisits).where(eq(cafeVisits.id, id))
  })
