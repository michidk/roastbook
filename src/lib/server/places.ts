import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { places } from "@/db/schema"
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

function normalizePlaceInput<T extends { latitude?: CoordinateInput; longitude?: CoordinateInput }>(
  data: T
) {
  return {
    ...data,
    latitude: normalizeCoordinate(data.latitude, "latitude"),
    longitude: normalizeCoordinate(data.longitude, "longitude"),
  }
}

export const getPlaces = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.places.findMany({
    orderBy: [desc(places.createdAt)],
    with: {
      images: true,
    },
  })
})

export const getPlace = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    return db.query.places.findFirst({
      where: eq(places.id, id),
      with: {
        images: true,
        cafeVisits: true,
      },
    })
  })

export const createPlace = createServerFn({ method: "POST" })
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
    }) => normalizePlaceInput(data)
  )
  .handler(async ({ data }) => {
    const [place] = await db.insert(places).values(data).returning()
    return place
  })

export const updatePlace = createServerFn({ method: "POST" })
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
    }) => normalizePlaceInput(data)
  )
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [place] = await db
      .update(places)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(places.id, id))
      .returning()
    return place
  })

export const deletePlace = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(places).where(eq(places.id, id))
  })


