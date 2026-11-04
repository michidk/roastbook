import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '@/db'
import {
  allocateJournalIds,
  runJournalMutations,
} from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { gearSets } from '@/db/schema'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { replaceGearSetAccessoryGear } from '@/lib/server/accessory-gear.server'
import { positiveIdSchema } from '@/lib/server-validation'
import {
  gearSetListSchema,
  gearSetUpdateSchema,
  gearSetWriteSchema,
} from '@/modules/journal/gear-sets-input'

class GearSetInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GearSetInputError'
  }
}

type GearSetWrite = z.infer<typeof gearSetWriteSchema>

const gearSetRelations = {
  machine: { columns: { id: true, name: true } },
  grinder: { columns: { id: true, name: true } },
  basket: { columns: { id: true, name: true } },
  accessoryGearLinks: {
    with: { gear: { columns: { id: true, name: true } } },
  },
} as const

type GearSetRow = NonNullable<Awaited<ReturnType<typeof queryGearSetById>>>

const queryGearSetById = createServerOnlyFn((id: number) => {
  return db.query.gearSets.findFirst({
    where: owned(gearSets, eq(gearSets.id, id)),
    with: gearSetRelations,
  })
})

function toGearSet(row: GearSetRow) {
  const { accessoryGearLinks, ...values } = row
  return {
    ...values,
    accessoryGear: accessoryGearLinks.map(({ gear }) => gear),
    accessoryGearIds: accessoryGearLinks.map(({ gear }) => gear.id),
  }
}

function toGearSetRow(data: GearSetWrite) {
  return {
    name: data.name,
    description: data.description?.trim() || null,
    machineId: data.machineId,
    grinderId: data.grinderId,
    basketId: data.basketId,
  }
}

async function assertUniqueName(name: string, excludeId?: number) {
  const duplicate = await db.query.gearSets.findFirst({
    where: owned(
      gearSets,
      excludeId
        ? and(
            ne(gearSets.id, excludeId),
            sql`lower(${gearSets.name}) = lower(${name})`,
          )
        : sql`lower(${gearSets.name}) = lower(${name})`,
    ),
  })
  if (duplicate) {
    throw new GearSetInputError('A gear set with this name already exists')
  }
}

export const getGearSets = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db.query.gearSets.findMany({
      where: owned(gearSets),
      orderBy: [asc(gearSets.name), asc(gearSets.id)],
      with: gearSetRelations,
    })
    return rows.map(toGearSet)
  },
)

const GEAR_SETS_PAGE_SIZE = 12

export const getGearSetPage = createServerFn({ method: 'GET' })
  .validator(gearSetListSchema)
  .handler(async ({ data }) => {
    const where = data.query
      ? sql`lower(${gearSets.name}) like lower(${escapedContainsPattern(data.query)}) escape ${'\\'}`
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(gearSets)
      .where(owned(gearSets, where))
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(
      totalItems,
      data.page,
      GEAR_SETS_PAGE_SIZE,
    )
    const sortColumn =
      data.sort === 'added' ? gearSets.createdAt : gearSets.name
    const order = data.direction === 'asc' ? asc(sortColumn) : desc(sortColumn)
    const rows = await db.query.gearSets.findMany({
      where: owned(gearSets, where),
      orderBy: [order, asc(gearSets.id)],
      limit: GEAR_SETS_PAGE_SIZE,
      offset: (pagination.page - 1) * GEAR_SETS_PAGE_SIZE,
      with: gearSetRelations,
    })
    return { items: rows.map(toGearSet), ...pagination }
  })

export const getGearSetById = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const row = await queryGearSetById(id)
    return row ? toGearSet(row) : null
  })

export const createGearSet = createServerFn({ method: 'POST' })
  .validator(gearSetWriteSchema)
  .handler(async ({ data }) => {
    await assertUniqueName(data.name)
    const [id] = await allocateJournalIds(gearSets)
    if (id === undefined)
      throw new Error('Could not allocate a gear set identifier')
    await runJournalMutations([
      {
        statement: db
          .insert(gearSets)
          .values(journalInsertValues({ id, ...toGearSetRow(data) }))
          .getSQL(),
      },
      ...(await replaceGearSetAccessoryGear(id, data.accessoryGearIds)),
    ])
    return expectReturnedRow(
      await db.query.gearSets.findFirst({
        where: owned(gearSets, eq(gearSets.id, id)),
      }),
      'Gear set',
    )
  })

export const updateGearSet = createServerFn({ method: 'POST' })
  .validator(gearSetUpdateSchema)
  .handler(async ({ data }) => {
    await assertUniqueName(data.name, data.id)
    await runJournalMutations([
      {
        statement: db
          .update(gearSets)
          .set({ ...toGearSetRow(data), updatedAt: new Date() })
          .where(owned(gearSets, eq(gearSets.id, data.id)))
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Gear set not found',
      },
      ...(await replaceGearSetAccessoryGear(data.id, data.accessoryGearIds)),
    ])
    return expectReturnedRow(
      await db.query.gearSets.findFirst({
        where: owned(gearSets, eq(gearSets.id, data.id)),
      }),
      'Gear set',
    )
  })

export const deleteGearSet = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [item] = await db
      .delete(gearSets)
      .where(owned(gearSets, eq(gearSets.id, id)))
      .returning({ id: gearSets.id })
    expectReturnedRow(item, 'Gear set')
  })
