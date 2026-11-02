import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, inArray, ne, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  allocateJournalIds,
  type JournalMutation,
  runJournalMutations,
} from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import {
  brewingMethodDrinkTypes,
  brewingMethods,
  drinkTypes,
  recipes,
  settings,
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

async function replaceBrewingMethodDrinkTypes(
  brewingMethodId: number,
  drinkTypeIds: readonly number[],
): Promise<JournalMutation[]> {
  if (drinkTypeIds.length > 0) {
    const activeTypes = await db
      .select({ id: drinkTypes.id })
      .from(drinkTypes)
      .where(
        owned(
          drinkTypes,
          and(
            inArray(drinkTypes.id, drinkTypeIds),
            eq(drinkTypes.isArchived, false),
          ),
        ),
      )
    if (activeTypes.length !== drinkTypeIds.length) {
      throw new BrewingMethodInputError('Choose only active drink types')
    }
  }
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(brewingMethodDrinkTypes)
        .where(
          owned(
            brewingMethodDrinkTypes,
            eq(brewingMethodDrinkTypes.brewingMethodId, brewingMethodId),
          ),
        )
        .getSQL(),
    },
  ]
  if (!drinkTypeIds.length) return mutations
  const ids = await allocateJournalIds(
    brewingMethodDrinkTypes,
    drinkTypeIds.length,
  )
  const rows = ids.map((id, index) => {
    const drinkTypeId = drinkTypeIds[index]
    if (drinkTypeId === undefined)
      throw new Error('Invalid drink type allocation')
    return { id, brewingMethodId, drinkTypeId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(brewingMethodDrinkTypes)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
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
      where: owned(brewingMethods),
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
          sql`lower(${brewingMethods.name}) like lower(${pattern}) escape ${'\\'}`,
          sql`lower(${brewingMethods.description}) like lower(${pattern}) escape ${'\\'}`,
        )
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(brewingMethods)
      .where(owned(brewingMethods, where))
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
        recipeCount: sql<number>`cast((select count(*) from ${recipes} where ${owned(recipes)} and ${recipes.brewingMethodId} = ${brewingMethods.id}) as integer)`,
        shotCount: sql<number>`cast((select count(*) from ${shots} where ${owned(shots)} and ${shots.brewingMethodId} = ${brewingMethods.id}) as integer)`,
      })
      .from(brewingMethods)
      .where(owned(brewingMethods, where))
      .orderBy(asc(brewingMethods.name), asc(brewingMethods.id))
      .limit(pagination.pageSize)
      .offset(offset)

    return { items, ...pagination }
  })

export const getBrewingMethod = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const method = await db.query.brewingMethods.findFirst({
      where: owned(brewingMethods, eq(brewingMethods.id, id)),
      with: { drinkTypeLinks: true },
    })
    return method ? withDrinkTypeIds(method) : undefined
  })

export const createBrewingMethod = createServerFn({ method: 'POST' })
  .validator((input: unknown) =>
    normalizeBrewingMethodWrite(brewingMethodWriteSchema.parse(input)),
  )
  .handler(async ({ data }) => {
    const duplicate = await db.query.brewingMethods.findFirst({
      where: owned(
        brewingMethods,
        sql`lower(${brewingMethods.name}) = lower(${data.name})`,
      ),
    })
    if (duplicate)
      throw new BrewingMethodInputError(
        'A brewing method with this name already exists',
      )
    const [id] = await allocateJournalIds(brewingMethods)
    if (id === undefined)
      throw new Error('Could not allocate a brewing method identifier')
    const { drinkTypeIds, ...methodValues } = data
    await runJournalMutations([
      {
        statement: db
          .insert(brewingMethods)
          .values(journalInsertValues({ id, ...methodValues }))
          .getSQL(),
      },
      ...(await replaceBrewingMethodDrinkTypes(id, drinkTypeIds)),
    ])
    const method = expectReturnedRow(
      await db.query.brewingMethods.findFirst({
        where: owned(brewingMethods, eq(brewingMethods.id, id)),
      }),
      'Brewing method',
    )
    return { ...method, drinkTypeIds }
  })

export const updateBrewingMethod = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = brewingMethodUpdateSchema.parse(input)
    return { id: data.id, ...normalizeBrewingMethodWrite(data) }
  })
  .handler(async ({ data }) => {
    const duplicate = await db.query.brewingMethods.findFirst({
      where: owned(
        brewingMethods,
        and(
          ne(brewingMethods.id, data.id),
          sql`lower(${brewingMethods.name}) = lower(${data.name})`,
        ),
      ),
    })
    if (duplicate)
      throw new BrewingMethodInputError(
        'A brewing method with this name already exists',
      )
    await runJournalMutations([
      {
        statement: db
          .update(brewingMethods)
          .set({
            name: data.name,
            description: data.description,
            enabledParameters: [...data.enabledParameters],
            timerEnabled: data.timerEnabled,
            updatedAt: new Date(),
          })
          .where(owned(brewingMethods, eq(brewingMethods.id, data.id)))
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Brewing method not found',
      },
      ...(await replaceBrewingMethodDrinkTypes(data.id, data.drinkTypeIds)),
    ])
    const method = expectReturnedRow(
      await db.query.brewingMethods.findFirst({
        where: owned(brewingMethods, eq(brewingMethods.id, data.id)),
      }),
      'Brewing method',
    )
    return { ...method, drinkTypeIds: data.drinkTypeIds }
  })

export const deleteBrewingMethod = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [methodCount] = await db
      .select({ value: count() })
      .from(brewingMethods)
      .where(owned(brewingMethods))
    if (!methodCount || methodCount.value <= 1) {
      throw new BrewingMethodInputError('Keep at least one brewing method')
    }
    const [shotCount] = await db
      .select({ value: count() })
      .from(shots)
      .where(owned(shots, eq(shots.brewingMethodId, id)))
    const [recipeCount] = await db
      .select({ value: count() })
      .from(recipes)
      .where(owned(recipes, eq(recipes.brewingMethodId, id)))
    if ((shotCount?.value ?? 0) > 0 || (recipeCount?.value ?? 0) > 0) {
      throw new BrewingMethodInputError(
        'This brewing method is still used by shots or recipes',
      )
    }
    await runJournalMutations([
      // Serialize the count invariant per owner on PostgreSQL. D1 serializes batches.
      {
        statement: db
          .update(settings)
          .set({ updatedAt: sql`${settings.updatedAt}` })
          .where(owned(settings))
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Journal settings not found',
      },
      {
        statement: db
          .delete(brewingMethods)
          .where(
            owned(
              brewingMethods,
              and(
                eq(brewingMethods.id, id),
                sql`(select count(*) from ${brewingMethods} where ${owned(brewingMethods)}) > 1`,
              ),
            ),
          )
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Keep at least one brewing method',
      },
    ])
  })
