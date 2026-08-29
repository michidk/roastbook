import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  brewingMethodDrinkTypes,
  brewingMethods,
  drinkTypes,
  recipes,
  shots,
} from '@/db/schema'
import {
  hasOnlyShotParameterKeys,
  normalizeShotParameterKeys,
} from '@/lib/brewing-methods'
import { escapedContainsPattern } from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { getPaginationWindow } from '@/lib/pagination'
import {
  nameSchema,
  notesSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

class BrewingMethodInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrewingMethodInputError'
  }
}

const brewingMethodWriteSchema = z.object({
  name: nameSchema,
  description: notesSchema.nullable(),
  enabledParameters: z.array(z.string().max(100)).max(50),
  timerEnabled: z.boolean(),
  drinkTypeIds: z.array(positiveIdSchema).max(100).default([]),
})

const brewingMethodUpdateSchema = brewingMethodWriteSchema.extend({
  id: positiveIdSchema,
})

function normalizeBrewingMethodWrite(
  data: z.infer<typeof brewingMethodWriteSchema>,
) {
  if (!hasOnlyShotParameterKeys(data.enabledParameters)) {
    throw new BrewingMethodInputError('Choose only supported shot parameters')
  }
  if (
    data.timerEnabled &&
    !data.enabledParameters.includes('shotTimeSeconds')
  ) {
    throw new BrewingMethodInputError(
      'Enable the Brew time field before enabling the timer',
    )
  }
  return {
    name: data.name,
    description: data.description?.trim() || null,
    enabledParameters: [...normalizeShotParameterKeys(data.enabledParameters)],
    timerEnabled: data.timerEnabled,
    drinkTypeIds: [...new Set(data.drinkTypeIds)],
  }
}

type BrewingMethodTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

async function replaceBrewingMethodDrinkTypes(
  tx: BrewingMethodTransaction,
  brewingMethodId: number,
  drinkTypeIds: readonly number[],
) {
  if (drinkTypeIds.length > 0) {
    const activeTypes = await tx
      .select({ id: drinkTypes.id })
      .from(drinkTypes)
      .where(
        and(
          inArray(drinkTypes.id, drinkTypeIds),
          eq(drinkTypes.isArchived, false),
        ),
      )
    if (activeTypes.length !== drinkTypeIds.length) {
      throw new BrewingMethodInputError('Choose only active drink types')
    }
  }

  await tx
    .delete(brewingMethodDrinkTypes)
    .where(eq(brewingMethodDrinkTypes.brewingMethodId, brewingMethodId))
  if (drinkTypeIds.length > 0) {
    await tx.insert(brewingMethodDrinkTypes).values(
      drinkTypeIds.map((drinkTypeId) => ({
        brewingMethodId,
        drinkTypeId,
      })),
    )
  }
}

function withDrinkTypeIds<
  Method extends {
    readonly drinkTypeLinks: readonly { readonly drinkTypeId: number }[]
  },
>({ drinkTypeLinks, ...method }: Method) {
  return {
    ...method,
    drinkTypeIds: drinkTypeLinks.map((link) => link.drinkTypeId),
  }
}

const BREWING_METHODS_PAGE_SIZE = 24
const brewingMethodListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})

export const getBrewingMethods = createServerFn({ method: 'GET' }).handler(
  async () => {
    const methods = await db.query.brewingMethods.findMany({
      orderBy: [asc(brewingMethods.id)],
      with: { drinkTypeLinks: true },
    })
    return methods.map(withDrinkTypeIds)
  },
)

export const getBrewingMethodPage = createServerFn({ method: 'GET' })
  .validator(brewingMethodListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const where = data.query
      ? or(
          ilike(brewingMethods.name, pattern),
          ilike(brewingMethods.description, pattern),
        )
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(brewingMethods)
      .where(where)
    const totalItems = countRows[0]?.value ?? 0
    const { offset, ...pagination } = getPaginationWindow(
      totalItems,
      data.page,
      BREWING_METHODS_PAGE_SIZE,
    )
    const items = await db
      .select({
        id: brewingMethods.id,
        name: brewingMethods.name,
        description: brewingMethods.description,
        enabledParameters: brewingMethods.enabledParameters,
        timerEnabled: brewingMethods.timerEnabled,
        recipeCount: sql<number>`(select count(*) from ${recipes} where ${recipes.brewingMethodId} = ${brewingMethods.id})::int`,
        shotCount: sql<number>`(select count(*) from ${shots} where ${shots.brewingMethodId} = ${brewingMethods.id})::int`,
      })
      .from(brewingMethods)
      .where(where)
      .orderBy(asc(brewingMethods.name), asc(brewingMethods.id))
      .limit(pagination.pageSize)
      .offset(offset)

    return { items, ...pagination }
  })

export const getBrewingMethod = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const method = await db.query.brewingMethods.findFirst({
      where: eq(brewingMethods.id, id),
      with: { drinkTypeLinks: true },
    })
    return method ? withDrinkTypeIds(method) : undefined
  })

export const createBrewingMethod = createServerFn({ method: 'POST' })
  .validator((input: unknown) =>
    normalizeBrewingMethodWrite(brewingMethodWriteSchema.parse(input)),
  )
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const duplicate = await tx.query.brewingMethods.findFirst({
        where: sql`lower(${brewingMethods.name}) = lower(${data.name})`,
      })
      if (duplicate) {
        throw new BrewingMethodInputError(
          'A brewing method with this name already exists',
        )
      }
      const { drinkTypeIds, ...methodValues } = data
      const [method] = await tx
        .insert(brewingMethods)
        .values(methodValues)
        .returning()
      const savedMethod = expectReturnedRow(method, 'Brewing method')
      await replaceBrewingMethodDrinkTypes(tx, savedMethod.id, drinkTypeIds)
      return { ...savedMethod, drinkTypeIds }
    }),
  )

export const updateBrewingMethod = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = brewingMethodUpdateSchema.parse(input)
    return { id: data.id, ...normalizeBrewingMethodWrite(data) }
  })
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const duplicate = await tx.query.brewingMethods.findFirst({
        where: and(
          ne(brewingMethods.id, data.id),
          sql`lower(${brewingMethods.name}) = lower(${data.name})`,
        ),
      })
      if (duplicate) {
        throw new BrewingMethodInputError(
          'A brewing method with this name already exists',
        )
      }
      const [method] = await tx
        .update(brewingMethods)
        .set({
          name: data.name,
          description: data.description,
          enabledParameters: [...data.enabledParameters],
          timerEnabled: data.timerEnabled,
          updatedAt: new Date(),
        })
        .where(eq(brewingMethods.id, data.id))
        .returning()
      const savedMethod = expectReturnedRow(method, 'Brewing method')
      await replaceBrewingMethodDrinkTypes(
        tx,
        savedMethod.id,
        data.drinkTypeIds,
      )
      return { ...savedMethod, drinkTypeIds: data.drinkTypeIds }
    }),
  )

export const deleteBrewingMethod = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`LOCK TABLE ${brewingMethods} IN SHARE ROW EXCLUSIVE MODE`,
      )
      const [methodCount] = await tx
        .select({ value: count() })
        .from(brewingMethods)
      if (!methodCount || methodCount.value <= 1) {
        throw new BrewingMethodInputError('Keep at least one brewing method')
      }
      const [shotCount] = await tx
        .select({ value: count() })
        .from(shots)
        .where(eq(shots.brewingMethodId, id))
      const [recipeCount] = await tx
        .select({ value: count() })
        .from(recipes)
        .where(eq(recipes.brewingMethodId, id))
      if ((shotCount?.value ?? 0) > 0 || (recipeCount?.value ?? 0) > 0) {
        throw new BrewingMethodInputError(
          'This brewing method is still used by shots or recipes',
        )
      }
      const [method] = await tx
        .delete(brewingMethods)
        .where(eq(brewingMethods.id, id))
        .returning({ id: brewingMethods.id })
      expectReturnedRow(method, 'Brewing method')
    }),
  )
