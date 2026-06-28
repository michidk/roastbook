import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { roasters } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export const getRoasters = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.roasters.findMany({
    orderBy: [desc(roasters.createdAt)],
    with: {
      beans: true,
    },
  })
})

export const getRoaster = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    return db.query.roasters.findFirst({
      where: eq(roasters.id, id),
      with: {
        beans: true,
      },
    })
  })

export const createRoaster = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string
      location?: string
      country?: string
      website?: string
      instagramHandle?: string
      notes?: string
    }) => data
  )
  .handler(async ({ data }) => {
    const [roaster] = await db.insert(roasters).values(data).returning()
    return roaster
  })

export const updateRoaster = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: number
      name?: string
      location?: string | null
      country?: string | null
      website?: string | null
      instagramHandle?: string | null
      notes?: string | null
    }) => data
  )
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [roaster] = await db
      .update(roasters)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(roasters.id, id))
      .returning()
    return roaster
  })

export const deleteRoaster = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(roasters).where(eq(roasters.id, id))
  })
