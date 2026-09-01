import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  espressoMachineSettingRevisions,
  gear,
  gearPropertyEvidence,
} from '@/db/schema'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { GEAR_TYPE_VALUES } from '@/lib/domain-contracts'
import { DomainError, expectReturnedRow } from '@/lib/domain-errors'
import { gearName } from '@/lib/gear-name'
import {
  basketDetailsSchema,
  brewerDetailsSchema,
  espressoMachineDetailsSchema,
  espressoMachineSettingsSchema,
  gearPropertyEvidenceSchema,
  grinderDetailsSchema,
  kettleDetailsSchema,
  scaleDetailsSchema,
  tamperDetailsSchema,
  wdtDetailsSchema,
} from '@/lib/gear-property-schemas'
import {
  isResearchEnabled,
  researchMachineFromWeb,
} from '@/lib/server/ai-operations.server'
import {
  type GearPropertyPayload,
  syncGearProperties,
} from '@/lib/server/gear-properties.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
  boundedDecimalStringSchema,
  currencySchema,
  nameSchema,
  notesSchema,
  positiveIdSchema,
} from '@/lib/server-validation'
import type { ExtractedMachineResearch } from '@/modules/ai/read-models'

const nullableUrl = z.union([z.url().max(2_048), z.literal('')]).nullable()

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
  espressoMachineDetails: espressoMachineDetailsSchema.nullable().optional(),
  ownerMachineSettings: espressoMachineSettingsSchema.nullable().optional(),
  factoryMachineSettings: espressoMachineSettingsSchema.nullable().optional(),
  grinderDetails: grinderDetailsSchema.nullable().optional(),
  brewerDetails: brewerDetailsSchema.nullable().optional(),
  kettleDetails: kettleDetailsSchema.nullable().optional(),
  scaleDetails: scaleDetailsSchema.nullable().optional(),
  tamperDetails: tamperDetailsSchema.nullable().optional(),
  wdtDetails: wdtDetailsSchema.nullable().optional(),
  basketDetails: basketDetailsSchema.nullable().optional(),
  propertyEvidence: z.array(gearPropertyEvidenceSchema).max(100).optional(),
})

const gearUpdateSchema = gearCreateSchema.partial().extend({
  id: positiveIdSchema,
  confirmTypeChange: z.boolean().optional(),
})

const researchMachineSettingsSchema = z.object({
  brand: nameSchema,
  model: nameSchema,
  knownContext: z
    .object({
      type: z.enum(GEAR_TYPE_VALUES).optional(),
      manualUrl: z.string().trim().max(2_048).optional(),
      productUrl: z.string().trim().max(2_048).optional(),
      notes: notesSchema.optional(),
    })
    .optional(),
})

type GearValues = z.infer<typeof gearCreateSchema>

const gearRelations = {
  images: true as const,
  espressoMachineDetails: true as const,
  machineSettingRevisions: {
    orderBy: [desc(espressoMachineSettingRevisions.effectiveFrom)],
  },
  grinderDetails: true as const,
  brewerDetails: true as const,
  kettleDetails: true as const,
  scaleDetails: true as const,
  tamperDetails: true as const,
  wdtDetails: true as const,
  basketDetails: true as const,
  propertyEvidence: {
    orderBy: [desc(gearPropertyEvidence.acceptedAt)],
  },
}

function toGearUpdateRow(data: Partial<GearValues>) {
  const {
    espressoMachineDetails: _espressoMachineDetails,
    ownerMachineSettings: _ownerMachineSettings,
    factoryMachineSettings: _factoryMachineSettings,
    grinderDetails: _grinderDetails,
    brewerDetails: _brewerDetails,
    kettleDetails: _kettleDetails,
    scaleDetails: _scaleDetails,
    tamperDetails: _tamperDetails,
    wdtDetails: _wdtDetails,
    basketDetails: _basketDetails,
    propertyEvidence: _propertyEvidence,
    ...values
  } = data
  return values
}

function hasPropertyPayload(data: Partial<GearValues>) {
  return [
    data.espressoMachineDetails,
    data.ownerMachineSettings,
    data.factoryMachineSettings,
    data.grinderDetails,
    data.brewerDetails,
    data.kettleDetails,
    data.scaleDetails,
    data.tamperDetails,
    data.wdtDetails,
    data.basketDetails,
    data.propertyEvidence,
  ].some((value) => value !== undefined)
}

export const getGear = createServerFn({ method: 'GET' }).handler(async () =>
  db.query.gear.findMany({
    orderBy: [desc(gear.createdAt)],
    with: gearRelations,
  }),
)

const GEAR_PAGE_SIZE = 12
const gearListSchema = z.object({
  activePage: z.number().int().min(1).max(100_000).default(1),
  archivedPage: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['added', 'name', 'type']).default('added'),
  direction: z.enum(['asc', 'desc']).default('desc'),
})

export const getGearPage = createServerFn({ method: 'GET' })
  .validator(gearListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const search = data.query
      ? or(
          ilike(gear.name, pattern),
          ilike(gear.brand, pattern),
          ilike(gear.model, pattern),
        )
      : undefined
    const sortColumn =
      data.sort === 'name'
        ? gear.name
        : data.sort === 'type'
          ? gear.type
          : gear.createdAt
    const order = data.direction === 'asc' ? asc(sortColumn) : desc(sortColumn)

    async function loadArchiveState(
      isArchived: boolean,
      requestedPage: number,
    ) {
      const where = search
        ? and(eq(gear.isArchived, isArchived), search)
        : eq(gear.isArchived, isArchived)
      const countRows = await db
        .select({ value: count() })
        .from(gear)
        .where(where)
      const totalItems = countRows[0]?.value ?? 0
      const pagination = resolvePagination(
        totalItems,
        requestedPage,
        GEAR_PAGE_SIZE,
      )
      const items = await db.query.gear.findMany({
        where,
        orderBy: [order, asc(gear.id)],
        limit: GEAR_PAGE_SIZE,
        offset: (pagination.page - 1) * GEAR_PAGE_SIZE,
        with: { images: true },
      })
      return { items, ...pagination }
    }

    const [active, archived] = await Promise.all([
      loadArchiveState(false, data.activePage),
      loadArchiveState(true, data.archivedPage),
    ])
    return {
      active,
      archived,
      totalItems: active.totalItems + archived.totalItems,
    }
  })

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
      const { type, ...values } = data
      const [item] = await tx
        .insert(gear)
        .values({
          ...toGearUpdateRow(values),
          type,
          name: gearName(data.brand, data.model),
        })
        .returning()
      const persistedItem = expectReturnedRow(item, 'Gear')
      await syncGearProperties(tx, persistedItem.id, type, data, false)
      return persistedItem
    }),
  )

export const updateGear = createServerFn({ method: 'POST' })
  .validator(gearUpdateSchema)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const { id, confirmTypeChange, ...values } = data
      const current = await tx.query.gear.findFirst({
        where: eq(gear.id, id),
        columns: { brand: true, model: true, type: true },
      })
      if (!current) throw new DomainError('not_found', 'Gear not found')
      const typeChanged =
        values.type !== undefined && values.type !== current.type
      if (typeChanged && !confirmTypeChange) {
        throw new DomainError(
          'validation',
          'Confirm the gear type change before removing incompatible details',
        )
      }
      let derivedName: string | undefined
      if (values.brand !== undefined || values.model !== undefined) {
        derivedName =
          gearName(
            values.brand ?? current.brand,
            values.model ?? current.model,
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
      if (typeChanged || hasPropertyPayload(values)) {
        await syncGearProperties(
          tx,
          id,
          persistedItem.type,
          values as GearPropertyPayload,
          typeChanged,
        )
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
  .handler(async ({ data }): Promise<ExtractedMachineResearch> => {
    if (!isResearchEnabled()) {
      throw new Error('OpenAI research is not configured')
    }

    return withResourceLimits('machine-web-research', () =>
      researchMachineFromWeb(data.brand, data.model, data.knownContext),
    )
  })
