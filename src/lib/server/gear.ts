import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { gear } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export const getGear = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.gear.findMany({
    orderBy: [desc(gear.createdAt)],
    with: {
      images: true,
    },
  })
})

export const getGearById = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    return db.query.gear.findFirst({
      where: eq(gear.id, id),
      with: {
        images: true,
      },
    })
  })



export const createGear = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string
      brand?: string
      model?: string
      type:
        | "espresso_machine"
        | "grinder"
        | "kettle"
        | "scale"
        | "tamper"
        | "wdt"
        | "other"
      purchaseDate?: Date
      purchasePrice?: string
      priceCurrency?: string
      manualUrl?: string
      productUrl?: string
      notes?: string
    }) => data
  )
  .handler(async ({ data }) => {
    const [item] = await db.insert(gear).values(data).returning()
    return item
  })

export const updateGear = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: number
      name?: string
      brand?: string
      model?: string
      type?:
        | "espresso_machine"
        | "grinder"
        | "kettle"
        | "scale"
        | "tamper"
        | "wdt"
        | "other"
      purchaseDate?: Date | null
      purchasePrice?: string | null
      priceCurrency?: string | null
      manualUrl?: string | null
      productUrl?: string | null
      notes?: string
      isArchived?: boolean
    }) => data
  )
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [item] = await db
      .update(gear)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(gear.id, id))
      .returning()
    return item
  })

export const deleteGear = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(gear).where(eq(gear.id, id))
  })




