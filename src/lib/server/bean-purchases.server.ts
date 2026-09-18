import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { beanPurchases, shots } from '@/db/schema'
import { expectReturnedRow } from '@/lib/domain-errors'

export type BeanPurchaseValues = {
  readonly purchasedAt?: Date | null
  readonly roastDate?: Date | null
  readonly initialWeightGrams?: string | null
  readonly price?: string | null
  readonly priceCurrency?: string | null
  readonly shopUrl?: string | null
  readonly isArchived?: boolean
}

type BeanPurchaseTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export async function createBeanPurchaseOperation(
  tx: BeanPurchaseTransaction,
  beanId: number,
  values: BeanPurchaseValues,
) {
  const [purchase] = await tx
    .insert(beanPurchases)
    .values({ beanId, ...values })
    .returning()
  return expectReturnedRow(purchase, 'Bag')
}

export async function updateBeanPurchaseOperation(
  id: number,
  beanId: number,
  values: BeanPurchaseValues,
) {
  const [purchase] = await db
    .update(beanPurchases)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(beanPurchases.id, id), eq(beanPurchases.beanId, beanId)))
    .returning()
  return expectReturnedRow(purchase, 'Bag')
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
      usedWeightGrams: sql<string>`coalesce(sum(${shots.doseGrams}), 0)::text`,
    })
    .from(shots)
    .where(inArray(shots.beanPurchaseId, purchaseIds))
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
