import { and, eq, inArray, sql } from 'drizzle-orm'
import { beanPurchases, shots } from '@/db/schema'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
  runJournalMutations,
} from '@/journal/platform/database'
import { expectReturnedRow } from '@/lib/domain-errors'

export type BeanPurchaseValues = {
  readonly purchasedAt?: Date | null
  readonly roastDate?: Date | null
  readonly initialWeightGrams?: string | null
  readonly price?: string | null
  readonly priceCurrency?: string | null
  readonly shopName?: string | null
  readonly shopUrl?: string | null
  readonly isArchived?: boolean
}

export async function createBeanPurchaseMutations(
  beanId: number,
  values: BeanPurchaseValues,
) {
  const [id] = await allocateJournalIds(beanPurchases)
  if (id === undefined) throw new Error('Could not allocate a bag identifier')
  const mutations: JournalMutation[] = [
    {
      statement: db
        .insert(beanPurchases)
        .values(journalInsertValues({ id, beanId, ...values }))
        .getSQL(),
    },
  ]
  return { id, mutations }
}

export async function createBeanPurchaseOperation(
  beanId: number,
  values: BeanPurchaseValues,
) {
  const { id, mutations } = await createBeanPurchaseMutations(beanId, values)
  await runJournalMutations(mutations)
  return expectReturnedRow(
    await db.query.beanPurchases.findFirst({
      where: owned(beanPurchases, eq(beanPurchases.id, id)),
    }),
    'Bag',
  )
}

export async function updateBeanPurchaseOperation(
  id: number,
  beanId: number,
  values: BeanPurchaseValues,
) {
  await runJournalMutations([
    {
      statement: db
        .update(beanPurchases)
        .set({ ...values, updatedAt: new Date() })
        .where(
          owned(
            beanPurchases,
            and(eq(beanPurchases.id, id), eq(beanPurchases.beanId, beanId)),
          ),
        )
        .getSQL(),
      expectedChanges: 1,
      conflictMessage: 'Bag not found',
    },
  ])
  return expectReturnedRow(
    await db.query.beanPurchases.findFirst({
      where: owned(beanPurchases, eq(beanPurchases.id, id)),
    }),
    'Bag',
  )
}

export async function archiveBeanPurchaseOperation(
  id: number,
  beanId: number,
  isArchived: boolean,
) {
  return updateBeanPurchaseOperation(id, beanId, { isArchived })
}

export async function purchaseUsageById(purchaseIds: readonly number[]) {
  if (purchaseIds.length === 0) return new Map<number, string>()
  const rows = await db
    .select({
      purchaseId: shots.beanPurchaseId,
      usedWeightGrams: sql<string>`cast(coalesce(sum(cast(${shots.doseGrams} as numeric)), 0) as text)`,
    })
    .from(shots)
    .where(owned(shots, inArray(shots.beanPurchaseId, purchaseIds)))
    .groupBy(shots.beanPurchaseId)
  return new Map(
    rows.flatMap((row) =>
      row.purchaseId === null ? [] : [[row.purchaseId, row.usedWeightGrams]],
    ),
  )
}

export function newestPurchase<Purchase extends { readonly createdAt: Date }>(
  purchases: readonly Purchase[],
) {
  return [...purchases].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  )[0]
}
