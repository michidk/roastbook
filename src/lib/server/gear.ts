import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  allocateJournalIds,
  runJournalMutations,
} from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
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
  isResearchEnabled,
  researchMachineFromWeb,
} from '@/lib/server/ai-operations.server'
import { syncGearProperties } from '@/lib/server/gear-properties.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
  nameSchema,
  notesSchema,
  positiveIdSchema,
} from '@/lib/server-validation'
import type { ExtractedMachineResearch } from '@/modules/ai/read-models'
import {
  gearCreateSchema,
  gearListSchema,
  gearUpdateSchema,
} from '@/modules/journal/gear-input'

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
    where: owned(gear),
    orderBy: [desc(gear.createdAt)],
    with: gearRelations,
  }),
)

const GEAR_PAGE_SIZE = 12

export const getGearPage = createServerFn({ method: 'GET' })
  .validator(gearListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const search = data.query
      ? or(
          sql`lower(${gear.name}) like lower(${pattern}) escape ${'\\'}`,
          sql`lower(${gear.brand}) like lower(${pattern}) escape ${'\\'}`,
          sql`lower(${gear.model}) like lower(${pattern}) escape ${'\\'}`,
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
        .where(owned(gear, where))
      const totalItems = countRows[0]?.value ?? 0
      const pagination = resolvePagination(
        totalItems,
        requestedPage,
        GEAR_PAGE_SIZE,
      )
      const items = await db.query.gear.findMany({
        where: owned(gear, where),
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
      where: owned(gear, eq(gear.id, id)),
      with: gearRelations,
    }),
  )

export const createGear = createServerFn({ method: 'POST' })
  .validator(gearCreateSchema)
  .handler(async ({ data }) => {
    const [id] = await allocateJournalIds(gear)
    if (id === undefined)
      throw new Error('Could not allocate a gear identifier')
    const { type, ...values } = data
    const properties = await syncGearProperties(id, type, data, false)
    await runJournalMutations([
      {
        statement: db
          .insert(gear)
          .values(
            journalInsertValues({
              id,
              ...toGearUpdateRow(values),
              type,
              name: gearName(data.brand, data.model),
            }),
          )
          .getSQL(),
      },
      ...properties,
    ])
    return expectReturnedRow(
      await db.query.gear.findFirst({
        where: owned(gear, eq(gear.id, id)),
      }),
      'Gear',
    )
  })

export const updateGear = createServerFn({ method: 'POST' })
  .validator(gearUpdateSchema)
  .handler(async ({ data }) => {
    const { id, confirmTypeChange, ...values } = data
    const current = await db.query.gear.findFirst({
      where: owned(gear, eq(gear.id, id)),
      columns: { brand: true, model: true, type: true, updatedAt: true },
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
    const properties =
      typeChanged || hasPropertyPayload(values)
        ? await syncGearProperties(
            id,
            values.type ?? current.type,
            values,
            typeChanged,
          )
        : []
    await runJournalMutations([
      {
        statement: db
          .update(gear)
          .set({
            ...toGearUpdateRow(values),
            ...(derivedName ? { name: derivedName } : {}),
            updatedAt: new Date(
              Math.max(Date.now(), current.updatedAt.getTime() + 1),
            ),
          })
          .where(
            owned(
              gear,
              and(eq(gear.id, id), eq(gear.updatedAt, current.updatedAt)),
            ),
          )
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Gear changed. Reload and try again.',
      },
      ...properties,
    ])
    return expectReturnedRow(
      await db.query.gear.findFirst({
        where: owned(gear, eq(gear.id, id)),
      }),
      'Gear',
    )
  })

export const deleteGear = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('gear', id))

export const checkGearResearchEnabled = createServerFn({
  method: 'GET',
}).handler(async () => ({ enabled: await isResearchEnabled() }))

export const researchMachineSettings = createServerFn({ method: 'POST' })
  .validator(researchMachineSettingsSchema)
  .handler(async ({ data }): Promise<ExtractedMachineResearch> => {
    if (!(await isResearchEnabled())) {
      throw new Error(
        'Connect a provider with Responses API web search in Settings > AI',
      )
    }

    return withResourceLimits('machine-web-research', () =>
      researchMachineFromWeb(data.brand, data.model, data.knownContext),
    )
  })
