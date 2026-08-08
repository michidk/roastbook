import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { coffeeShops } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

type CoordinateInput = string | number | undefined

function normalizeCoordinate(
  value: CoordinateInput,
  field: "latitude" | "longitude"
) {
  if (value === undefined || value === "") {
    return undefined
  }

  const numericValue = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid ${field}`)
  }

  const [min, max] = field === "latitude" ? [-90, 90] : [-180, 180]

  if (numericValue < min || numericValue > max) {
    throw new Error(`${field} must be between ${min} and ${max}`)
  }

  return String(numericValue)
}

function normalizeCoffeeShopInput<T extends { latitude?: CoordinateInput; longitude?: CoordinateInput }>(
  data: T
) {
  return {
    ...data,
    latitude: normalizeCoordinate(data.latitude, "latitude"),
    longitude: normalizeCoordinate(data.longitude, "longitude"),
  }
}

export const getCoffeeShops = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.coffeeShops.findMany({
    orderBy: [desc(coffeeShops.createdAt)],
    with: {
      images: true,
    },
  })
})

export const getCoffeeShop = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    return db.query.coffeeShops.findFirst({
      where: eq(coffeeShops.id, id),
      with: {
        images: true,
        cafeVisits: true,
      },
    })
  })

export const createCoffeeShop = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string
      address?: string
      city?: string
      country?: string
      latitude?: CoordinateInput
      longitude?: CoordinateInput
      website?: string
      instagramHandle?: string
      notes?: string
    }) => normalizeCoffeeShopInput(data)
  )
  .handler(async ({ data }) => {
    const [coffeeShop] = await db.insert(coffeeShops).values(data).returning()
    return coffeeShop
  })

export const updateCoffeeShop = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: number
      name?: string
      address?: string
      city?: string
      country?: string
      latitude?: CoordinateInput
      longitude?: CoordinateInput
      website?: string
      instagramHandle?: string
      notes?: string
      rating?: number | null
      isFavorite?: boolean
    }) => normalizeCoffeeShopInput(data)
  )
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [coffeeShop] = await db
      .update(coffeeShops)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(coffeeShops.id, id))
      .returning()
    return coffeeShop
  })

export const deleteCoffeeShop = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(coffeeShops).where(eq(coffeeShops.id, id))
  })
