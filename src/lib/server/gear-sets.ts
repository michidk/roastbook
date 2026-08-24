import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, ilike, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { gearSets } from '@/db/schema'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { replaceGearSetAccessoryGear } from '@/lib/server/accessory-gear.server'
import {
  nameSchema,
  notesSchema,
  nullablePositiveIdSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

class GearSetInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GearSetInputError'
  }
}

const gearSetWriteSchema = z.object({
  name: nameSchema,
  description: notesSchema.nullable(),
  machineId: nullablePositiveIdSchema,
  grinderId: nullablePositiveIdSchema,
  basketId: nullablePositiveIdSchema,
  accessoryGearIds: z.array(positiveIdSchema).max(100),
})

const gearSetUpdateSchema = gearSetWriteSchema.extend({
  id: positiveIdSchema,
})

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

function queryGearSetById(id: number) {
  return db.query.gearSets.findFirst({
    where: eq(gearSets.id, id),
    with: gearSetRelations,
  })
}

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
    where: excludeId
      ? and(
          ne(gearSets.id, excludeId),
          sql`lower(${gearSets.name}) = lower(${name})`,
        )
      : sql`lower(${gearSets.name}) = lower(${name})`,
  })
  if (duplicate) {
    throw new GearSetInputError('A gear set with this name already exists')
  }
}

export const getGearSets = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db.query.gearSets.findMany({
      orderBy: [asc(gearSets.name), asc(gearSets.id)],
      with: gearSetRelations,
    })
    return rows.map(toGearSet)
  },
)

const GEAR_SETS_PAGE_SIZE = 12
const gearSetListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['name', 'added']).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

export const getGearSetPage = createServerFn({ method: 'GET' })
  .validator(gearSetListSchema)
  .handler(async ({ data }) => {
    const where = data.query
      ? ilike(gearSets.name, escapedContainsPattern(data.query))
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(gearSets)
      .where(where)
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
      where,
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
    return db.transaction(async (tx) => {
      const [item] = await tx
        .insert(gearSets)
        .values(toGearSetRow(data))
        .returning()
      const persistedItem = expectReturnedRow(item, 'Gear set')
      await replaceGearSetAccessoryGear(
        tx,
        persistedItem.id,
        data.accessoryGearIds,
      )
      return persistedItem
    })
  })

export const updateGearSet = createServerFn({ method: 'POST' })
  .validator(gearSetUpdateSchema)
  .handler(async ({ data }) => {
    await assertUniqueName(data.name, data.id)
    return db.transaction(async (tx) => {
      const [item] = await tx
        .update(gearSets)
        .set({ ...toGearSetRow(data), updatedAt: new Date() })
        .where(eq(gearSets.id, data.id))
        .returning()
      const persistedItem = expectReturnedRow(item, 'Gear set')
      await replaceGearSetAccessoryGear(tx, data.id, data.accessoryGearIds)
      return persistedItem
    })
  })

export const deleteGearSet = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [item] = await db
      .delete(gearSets)
      .where(eq(gearSets.id, id))
      .returning({ id: gearSets.id })
    expectReturnedRow(item, 'Gear set')
  })
