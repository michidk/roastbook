import { createServerFn } from "@tanstack/react-start"
import { desc, eq, or, sql } from "drizzle-orm"
import { db } from "@/db"
import { brewingMethods, shots, shotTasteTags } from "@/db/schema"
import { projectShotParameters } from "@/lib/server/shot-parameter-projection"
import {
  assertValidUpdate,
  getShotUpdateErrors,
  type ShotUpdateCandidate,
} from "@/lib/update-validation"

type ShotCreateCandidate = Omit<ShotUpdateCandidate, "id">

class ShotInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ShotInputError"
  }
}

type ShotTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function getBrewingMethod(
  tx: ShotTransaction,
  brewingMethodId: number,
) {
  const method = await tx.query.brewingMethods.findFirst({
    where: eq(brewingMethods.id, brewingMethodId),
  })
  if (!method) throw new ShotInputError("Brewing method not found")
  return method
}

function getShotValues(
  data: ShotCreateCandidate,
  enabledParameters: readonly string[],
) {
  return {
    brewingMethodId: data.brewingMethodId,
    beanId: data.beanId ?? null,
    ...projectShotParameters(data, enabledParameters),
    rating: data.rating ?? null,
    notes: data.notes ?? null,
  }
}

const shotRelations = {
  bean: true,
  machine: true,
  grinder: true,
  basket: true,
  brewingMethod: true,
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
      const method = await getBrewingMethod(tx, data.brewingMethodId)
      const [shot] = await tx
        .insert(shots)
        .values(getShotValues(data, method.enabledParameters))
        .returning()
      if (!shot) return null

      if (data.tasteTagIds && data.tasteTagIds.length > 0) {
        await tx.insert(shotTasteTags).values(
          [...new Set(data.tasteTagIds)].map((tasteTagId) => ({
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
      const method = await getBrewingMethod(tx, data.brewingMethodId)
      const { id, tasteTagIds } = data
      const [shot] = await tx
        .update(shots)
        .set({
          ...getShotValues(data, method.enabledParameters),
          updatedAt: new Date(),
        })
        .where(eq(shots.id, id))
        .returning()

      if (tasteTagIds !== undefined) {
        await tx.delete(shotTasteTags).where(eq(shotTasteTags.shotId, id))
        if (tasteTagIds.length > 0) {
          await tx.insert(shotTasteTags).values(
            [...new Set(tasteTagIds)].map((tasteTagId) => ({ shotId: id, tasteTagId })),
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

export const getLastShotForBean = createServerFn({ method: "GET" })
  .validator((beanId: number) => beanId)
  .handler(async ({ data: beanId }) =>
    db.query.shots.findFirst({
      where: eq(shots.beanId, beanId),
      orderBy: [desc(shots.createdAt)],
      with: { brewingMethod: true },
    }),
  )

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
  .handler(async ({ data: gearId }) =>
    db.query.shots.findMany({
      where: or(
        eq(shots.machineId, gearId),
        eq(shots.grinderId, gearId),
        eq(shots.basketId, gearId),
        sql`${gearId} = any(${shots.accessoryGearIds})`,
      ),
      orderBy: [desc(shots.createdAt)],
      with: shotRelations,
    }),
  )
