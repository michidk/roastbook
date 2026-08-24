import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { basketDetails, gear, machineSettings } from '@/db/schema'
import {
  type ExtractedMachineSettings,
  isResearchEnabled,
  researchMachineSettingsFromWeb,
} from '@/lib/ai'
import { isEspressoMachineGearType } from '@/lib/constants'
import { AUTO_STOP_MODE_VALUES, GEAR_TYPE_VALUES } from '@/lib/domain-contracts'
import { expectReturnedRow } from '@/lib/domain-errors'
import { gearName } from '@/lib/gear-name'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
  boundedDecimalStringSchema,
  currencySchema,
  nameSchema,
  notesSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

const nullableDecimal = boundedDecimalStringSchema(99_999, 2).nullable()
const nullableUrl = z.union([z.url().max(2_048), z.literal('')]).nullable()

const machineSettingsSchema = z.object({
  brewPressureOpvBar: nullableDecimal,
  supportsPreinfusion: z.boolean().nullable(),
  defaultPreinfusionEnabled: z.boolean().nullable(),
  defaultPreinfusionTimeSeconds: nullableDecimal,
  defaultPreinfusionPressureBar: nullableDecimal,
  defaultFlowLimitMlPerSecond: nullableDecimal,
  temperatureOffsetCelsius: boundedDecimalStringSchema(999.9, 1).nullable(),
  volumetricShotVolumeMl: nullableDecimal,
  autoStopMode: z.enum(AUTO_STOP_MODE_VALUES).nullable(),
  steamTemperatureCelsius: boundedDecimalStringSchema(999.9, 1).nullable(),
  steamPressureBar: nullableDecimal,
})

const basketDetailsSchema = z.object({
  nominalDoseGrams: boundedDecimalStringSchema(999.99, 2).nullable(),
})

const gearCreateSchema = z.object({
  brand: nameSchema,
  model: nameSchema,
  type: z.enum(GEAR_TYPE_VALUES),
  purchaseDate: z.date().nullable().optional(),
  purchasePrice: boundedDecimalStringSchema(999_999.99, 2)
    .nullable()
    .optional(),
  priceCurrency: currencySchema.nullable().optional(),
  manualUrl: nullableUrl.optional(),
  productUrl: nullableUrl.optional(),
  notes: notesSchema.nullable().optional(),
  isArchived: z.boolean().optional(),
  machineSettings: machineSettingsSchema.nullable().optional(),
  basketDetails: basketDetailsSchema.nullable().optional(),
})

const gearUpdateSchema = gearCreateSchema.partial().extend({
  id: positiveIdSchema,
})

const researchMachineSettingsSchema = z.object({
  brand: nameSchema,
  model: nameSchema,
})

type GearValues = z.infer<typeof gearCreateSchema>

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
  data: Pick<GearValues, 'type' | 'machineSettings' | 'basketDetails'>,
) {
  await tx.delete(machineSettings).where(eq(machineSettings.gearId, gearId))
  await tx.delete(basketDetails).where(eq(basketDetails.gearId, gearId))

  if (isEspressoMachineGearType(data.type) && data.machineSettings) {
    await tx.insert(machineSettings).values({ gearId, ...data.machineSettings })
  }
  if (data.type === 'basket' && data.basketDetails) {
    await tx.insert(basketDetails).values({ gearId, ...data.basketDetails })
  }
}

export const getGear = createServerFn({ method: 'GET' }).handler(async () =>
  db.query.gear.findMany({
    orderBy: [desc(gear.createdAt)],
    with: gearRelations,
  }),
)

export const getGearById = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.query.gear.findFirst({
      where: eq(gear.id, id),
      with: gearRelations,
    }),
  )

export const createGear = createServerFn({ method: 'POST' })
  .validator(gearCreateSchema)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const {
        machineSettings: _machineSettings,
        basketDetails: _basketDetails,
        ...gearValues
      } = data
      const [item] = await tx
        .insert(gear)
        .values({ ...gearValues, name: gearName(data.brand, data.model) })
        .returning()
      const persistedItem = expectReturnedRow(item, 'Gear')
      await replaceSubtype(tx, persistedItem.id, data)
      return persistedItem
    }),
  )

export const updateGear = createServerFn({ method: 'POST' })
  .validator(gearUpdateSchema)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { id, ...values } = data
      let derivedName: string | undefined
      if (values.brand !== undefined || values.model !== undefined) {
        const current = await tx.query.gear.findFirst({
          where: eq(gear.id, id),
          columns: { brand: true, model: true },
        })
        derivedName =
          gearName(
            values.brand ?? current?.brand,
            values.model ?? current?.model,
          ) || undefined
      }
      const [item] = await tx
        .update(gear)
        .set({
          ...toGearUpdateRow(values),
          ...(derivedName ? { name: derivedName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(gear.id, id))
        .returning()
      const persistedItem = expectReturnedRow(item, 'Gear')
      if (
        values.type !== undefined ||
        values.machineSettings !== undefined ||
        values.basketDetails !== undefined
      ) {
        await replaceSubtype(tx, id, {
          ...values,
          type: values.type ?? persistedItem.type,
        })
      }
      return persistedItem
    }),
  )

export const deleteGear = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('gear', id))

export const checkGearResearchEnabled = createServerFn({
  method: 'GET',
}).handler(async () => ({ enabled: isResearchEnabled() }))

export const researchMachineSettings = createServerFn({ method: 'POST' })
  .validator(researchMachineSettingsSchema)
  .handler(async ({ data }): Promise<ExtractedMachineSettings> => {
    if (!isResearchEnabled()) {
      throw new Error('OpenAI research is not configured')
    }

    return withResourceLimits('machine-web-research', () =>
      researchMachineSettingsFromWeb(data.brand, data.model),
    )
  })
