import { and, eq, exists, inArray, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { beanPurchases, beans, beanTagAssignments, shots } from '@/db/schema'
import { createBeanPurchaseMutations } from '@/journal/domain/bean-purchases'
import type { beanCreateSchema } from '@/journal/input/beans'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
} from '@/journal/platform/database'

export function shelfCondition() {
  const activeBag = db
    .select({ id: beanPurchases.id })
    .from(beanPurchases)
    .where(
      owned(
        beanPurchases,
        and(
          eq(beanPurchases.beanId, beans.id),
          eq(beanPurchases.isArchived, false),
        ),
      ),
    )
  return sql`(${beans.alwaysOnShelf} = true or ${exists(activeBag)})`
}

export async function replaceBeanTags(
  beanId: number,
  tagIds: readonly number[],
): Promise<JournalMutation[]> {
  const ids = [...new Set(tagIds)]
  return [
    {
      statement: db
        .delete(beanTagAssignments)
        .where(owned(beanTagAssignments, eq(beanTagAssignments.beanId, beanId)))
        .getSQL(),
    },
    ...(ids.length
      ? [
          {
            statement: db
              .insert(beanTagAssignments)
              .values(
                ids.map((tagId) => journalInsertValues({ beanId, tagId })),
              )
              .getSQL(),
          },
        ]
      : []),
  ]
}

export async function createBeanMutations(
  data: z.infer<typeof beanCreateSchema>,
) {
  const {
    createBag = true,
    beanTagIds = [],
    roastDate,
    weight,
    price,
    priceCurrency,
    shopName,
    shopUrl,
    isArchived,
    ...profile
  } = data
  const [id] = await allocateJournalIds(beans)
  if (id === undefined) throw new Error('Could not allocate bean identifier')
  const purchase = createBag
    ? await createBeanPurchaseMutations(id, {
        roastDate,
        initialWeightGrams: weight,
        price,
        priceCurrency,
        shopName,
        shopUrl,
        isArchived,
      })
    : null
  const mutations: JournalMutation[] = [
    {
      statement: db
        .insert(beans)
        .values(journalInsertValues({ id, ...profile }))
        .getSQL(),
    },
    ...(purchase?.mutations ?? []),
    ...(await replaceBeanTags(id, beanTagIds)),
  ]
  return { id, purchaseId: purchase?.id ?? null, mutations }
}

export async function beanRatings(beanIds: readonly number[]) {
  if (!beanIds.length)
    return new Map<
      number,
      { averageRating: number | null; ratedBrewCount: number }
    >()
  const rows = await db
    .select({
      beanId: shots.beanId,
      average: sql<string | null>`cast(avg(${shots.rating}) as text)`,
      count: sql<number>`cast(count(${shots.rating}) as integer)`,
    })
    .from(shots)
    .where(owned(shots, inArray(shots.beanId, beanIds)))
    .groupBy(shots.beanId)
  return new Map(
    rows.flatMap((row) =>
      row.beanId === null
        ? []
        : [
            [
              row.beanId,
              {
                averageRating:
                  row.average === null
                    ? null
                    : Number(Number(row.average).toFixed(1)),
                ratedBrewCount: Number(row.count),
              },
            ],
          ],
    ),
  )
}
