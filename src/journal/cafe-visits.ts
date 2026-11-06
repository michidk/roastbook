import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  beans,
  cafeVisits,
  cafeVisitTasteTags,
  coffeeShops,
  drinkTypes,
} from '@/db/schema'
import { createBeanMutations } from '@/journal/domain/bean-library'
import {
  assertDrinkSelection,
  replaceCafeVisitDrinkOptions,
} from '@/journal/domain/drink-options'
import { deleteEntityWithMedia } from '@/journal/domain/media-lifecycle'
import { journalRead, journalWrite } from '@/journal/function'
import {
  cafeVisitCreateSchema,
  cafeVisitListSchema,
  cafeVisitUpdateSchema,
} from '@/journal/input/cafe-visits'
import { journalNow } from '@/journal/platform/clock'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
  runJournalMutations,
  toDisplayableDatabaseError,
} from '@/journal/platform/database'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { positiveIdSchema } from '@/lib/server-validation'
import {
  assertValidUpdate,
  getCafeVisitUpdateErrors,
} from '@/lib/update-validation'

const VISITS_PAGE_SIZE = 18

const cafeVisitRelations = {
  coffeeShop: true,
  bean: true,
  drinkType: true,
  drinkOptions: { with: { optionValue: { with: { group: true } } } },
  tasteTags: {
    with: {
      tasteTag: true,
    },
  },
  images: true,
} as const

export const getCafeVisitPage = journalRead('cafe-visits/getCafeVisitPage')
  .validator(cafeVisitListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const where = data.query
      ? sql`exists (select 1 from ${drinkTypes} where ${owned(drinkTypes)} and ${drinkTypes.id} = ${cafeVisits.drinkTypeId} and lower(${drinkTypes.name}) like lower(${pattern}) escape ${'\\'})
          or exists (select 1 from ${coffeeShops} where ${owned(coffeeShops)} and ${coffeeShops.id} = ${cafeVisits.coffeeShopId} and lower(${coffeeShops.name}) like lower(${pattern}) escape ${'\\'})
          or exists (select 1 from ${beans} where ${owned(beans)} and ${beans.id} = ${cafeVisits.beanId} and lower(${beans.name}) like lower(${pattern}) escape ${'\\'})`
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(cafeVisits)
      .where(owned(cafeVisits, where))
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(
      totalItems,
      data.page,
      VISITS_PAGE_SIZE,
    )
    const { page } = pagination
    // Keep correlated search SQL in a select subquery. Relational-query aliasing
    // otherwise rewrites columns belonging to the nested café/bean/drink tables.
    const matchingIds = db
      .select({ id: cafeVisits.id })
      .from(cafeVisits)
      .where(owned(cafeVisits, where))
    const items = await db.query.cafeVisits.findMany({
      where: owned(cafeVisits, inArray(cafeVisits.id, matchingIds)),
      orderBy: [desc(cafeVisits.visitedAt), desc(cafeVisits.id)],
      limit: VISITS_PAGE_SIZE,
      offset: (page - 1) * VISITS_PAGE_SIZE,
      with: {
        coffeeShop: true,
        bean: true,
        drinkType: true,
        tasteTags: { with: { tasteTag: true } },
      },
    })
    return { items, ...pagination }
  })

export const getCafeVisit = journalRead('cafe-visits/getCafeVisit')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    try {
      return await db.query.cafeVisits.findFirst({
        where: owned(cafeVisits, eq(cafeVisits.id, id)),
        with: cafeVisitRelations,
      })
    } catch (error) {
      throw await toDisplayableDatabaseError(error)
    }
  })

async function replaceCafeVisitTasteTags(
  cafeVisitId: number,
  tasteTagIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(cafeVisitTasteTags)
        .where(
          owned(
            cafeVisitTasteTags,
            eq(cafeVisitTasteTags.cafeVisitId, cafeVisitId),
          ),
        )
        .getSQL(),
    },
  ]
  const selected = [...new Set(tasteTagIds)]
  if (!selected.length) return mutations
  const ids = await allocateJournalIds(cafeVisitTasteTags, selected.length)
  const rows = ids.map((id, index) => {
    const tasteTagId = selected[index]
    if (tasteTagId === undefined)
      throw new Error('Invalid taste tag allocation')
    return { id, cafeVisitId, tasteTagId }
  })
  for (let offset = 0; offset < rows.length; offset += 20) {
    mutations.push({
      statement: db
        .insert(cafeVisitTasteTags)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  }
  return mutations
}

export const createCafeVisit = journalWrite('cafe-visits/createCafeVisit')
  .validator(cafeVisitCreateSchema)
  .handler(async ({ data }) => {
    const {
      tasteTagIds = [],
      drinkOptionValueIds = [],
      newBean,
      ...visitData
    } = data
    await assertDrinkSelection(db, visitData.drinkTypeId, drinkOptionValueIds)
    const [id] = await allocateJournalIds(cafeVisits)
    if (id === undefined)
      throw new Error('Could not allocate a visit identifier')
    const createdBean = newBean
      ? await createBeanMutations({
          ...newBean,
          createBag: newBean.createBag ?? false,
        })
      : null
    await runJournalMutations([
      ...(createdBean?.mutations ?? []),
      {
        statement: db
          .insert(cafeVisits)
          .values(
            journalInsertValues({
              id,
              ...visitData,
              beanId: createdBean?.id ?? visitData.beanId,
            }),
          )
          .getSQL(),
      },
      ...(await replaceCafeVisitDrinkOptions(id, drinkOptionValueIds)),
      ...(await replaceCafeVisitTasteTags(id, tasteTagIds)),
    ])
    return expectReturnedRow(
      await db.query.cafeVisits.findFirst({
        where: owned(cafeVisits, eq(cafeVisits.id, id)),
      }),
      'Visit',
    )
  })

export const updateCafeVisit = journalWrite('cafe-visits/updateCafeVisit')
  .validator((input: unknown) => {
    const data = cafeVisitUpdateSchema.parse(input)
    assertValidUpdate(getCafeVisitUpdateErrors(data))
    return data
  })
  .handler(async ({ data }) => {
    const { id, tasteTagIds, drinkOptionValueIds, ...values } = data
    const current = expectReturnedRow(
      await db.query.cafeVisits.findFirst({
        where: owned(cafeVisits, eq(cafeVisits.id, id)),
        with: { drinkOptions: true },
      }),
      'Visit',
    )
    await assertDrinkSelection(
      db,
      values.drinkTypeId === undefined
        ? current.drinkTypeId
        : values.drinkTypeId,
      drinkOptionValueIds ??
        current.drinkOptions.map((option) => option.optionValueId),
    )
    const mutations: JournalMutation[] = [
      {
        statement: db
          .update(cafeVisits)
          .set({
            ...values,
            updatedAt: new Date(
              Math.max(journalNow().getTime(), current.updatedAt.getTime() + 1),
            ),
          })
          .where(
            owned(
              cafeVisits,
              and(
                eq(cafeVisits.id, id),
                eq(cafeVisits.updatedAt, current.updatedAt),
              ),
            ),
          )
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Visit changed. Reload and try again.',
      },
    ]
    if (drinkOptionValueIds !== undefined) {
      mutations.push(
        ...(await replaceCafeVisitDrinkOptions(id, drinkOptionValueIds)),
      )
    }
    if (tasteTagIds !== undefined) {
      mutations.push(...(await replaceCafeVisitTasteTags(id, tasteTagIds)))
    }
    await runJournalMutations(mutations)
    return expectReturnedRow(
      await db.query.cafeVisits.findFirst({
        where: owned(cafeVisits, eq(cafeVisits.id, id)),
      }),
      'Visit',
    )
  })

export const deleteCafeVisit = journalWrite('cafe-visits/deleteCafeVisit')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('visits', id))
