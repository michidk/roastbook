import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { basketDetails, gear, machineSettings } from "@/db/schema"
import type { GearType } from "@/lib/constants"
import type {
  BasketDetailsValues,
  MachineSettingsValues,
} from "@/lib/gear-parameters"

type GearValues = {
  readonly name: string
  readonly brand?: string | null
  readonly model?: string | null
  readonly type: GearType
  readonly purchaseDate?: Date | null
  readonly purchasePrice?: string | null
  readonly priceCurrency?: string | null
  readonly manualUrl?: string | null
  readonly productUrl?: string | null
  readonly notes?: string | null
  readonly isArchived?: boolean
  readonly machineSettings?: MachineSettingsValues | null
  readonly basketDetails?: BasketDetailsValues | null
}

type GearUpdate = Partial<GearValues> & { readonly id: number }

class GearPersistenceError extends Error {
  constructor() {
    super("Gear could not be persisted")
    this.name = "GearPersistenceError"
  }
}

const gearRelations = {
  images: true,
  machineSettings: true,
  basketDetails: true,
} as const

function toGearUpdateRow(data: Partial<GearValues>) {
  const {
    machineSettings: _machineSettings,
    basketDetails: _basketDetails,
    ...values
  } = data
  return values
}

async function replaceSubtype(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  gearId: number,
  data: GearValues,
) {
  await tx.delete(machineSettings).where(eq(machineSettings.gearId, gearId))
  await tx.delete(basketDetails).where(eq(basketDetails.gearId, gearId))

  if (data.type === "espresso_machine" && data.machineSettings) {
    await tx
      .insert(machineSettings)
      .values({ gearId, ...data.machineSettings })
  }
  if (data.type === "basket" && data.basketDetails) {
    await tx.insert(basketDetails).values({ gearId, ...data.basketDetails })
  }
}

export const getGear = createServerFn({ method: "GET" }).handler(async () =>
  db.query.gear.findMany({
    orderBy: [desc(gear.createdAt)],
    with: gearRelations,
  }),
)

export const getGearById = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) =>
    db.query.gear.findFirst({
      where: eq(gear.id, id),
      with: gearRelations,
    }),
  )

export const createGear = createServerFn({ method: "POST" })
  .validator((data: GearValues) => data)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const {
        machineSettings: _machineSettings,
        basketDetails: _basketDetails,
        ...gearValues
      } = data
      const [item] = await tx.insert(gear).values(gearValues).returning()
      if (!item) throw new GearPersistenceError()
      await replaceSubtype(tx, item.id, data)
      return item
    }),
  )

export const updateGear = createServerFn({ method: "POST" })
  .validator((data: GearUpdate) => data)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { id, ...values } = data
      const [item] = await tx
        .update(gear)
        .set({ ...toGearUpdateRow(values), updatedAt: new Date() })
        .where(eq(gear.id, id))
        .returning()
      if (!item) throw new GearPersistenceError()
      if (
        values.type !== undefined ||
        values.machineSettings !== undefined ||
        values.basketDetails !== undefined
      ) {
        await replaceSubtype(tx, id, {
          ...values,
          name: values.name ?? item.name,
          type: values.type ?? item.type,
        })
      }
      return item
    }),
  )

export const deleteGear = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(gear).where(eq(gear.id, id))
  })
