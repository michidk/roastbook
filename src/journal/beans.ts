import { and, count, desc, eq, exists, not, or } from 'drizzle-orm'
import { beanPurchases, beans, cafeVisits, recipes, shots } from '@/db/schema'
import {
  createBeanPurchaseMutations,
  newestPurchase,
  purchaseUsageById,
} from '@/journal/domain/bean-purchases'
import { deleteEntityWithMedia } from '@/journal/domain/media-lifecycle'
import { caseInsensitiveLike } from '@/journal/domain/portable-query'
import { journalRead, journalWrite } from '@/journal/function'
import {
  beanCreateSchema,
  beanListSchema,
  beanUpdateSchema,
  checkAltitudeRange,
} from '@/journal/input/beans'
import { journalNow } from '@/journal/platform/clock'
import {
  allocateJournalIds,
  db,
  journalInsertValues,
  owned,
  runJournalMutations,
} from '@/journal/platform/database'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { positiveIdSchema } from '@/lib/server-validation'

const ACTIVE_BEANS_PAGE_SIZE = 12
const ARCHIVED_BEANS_PAGE_SIZE = 24

export const getBeans = journalRead('beans/getBeans').handler(async () => {
  const rows = await db.query.beans.findMany({
    where: owned(beans),
    orderBy: [desc(beans.createdAt)],
    with: {
      images: true,
      roasterRef: true,
      purchases: { orderBy: [desc(beanPurchases.createdAt)] },
    },
  })
  return rows.map(flattenBeanPurchase)
})

function flattenBeanPurchase<
  Bean extends {
    readonly purchases: readonly (typeof beanPurchases.$inferSelect)[]
  },
>(bean: Bean) {
  const { purchases, ...profile } = bean
  const purchase =
    newestPurchase(purchases.filter((item) => !item.isArchived)) ??
    newestPurchase(purchases)
  return {
    ...profile,
    purchaseId: purchase?.id ?? null,
    roastDate: purchase?.roastDate ?? null,
    weight: purchase?.initialWeightGrams ?? null,
    price: purchase?.price ?? null,
    priceCurrency: purchase?.priceCurrency ?? null,
    shopName: purchase?.shopName ?? null,
    shopUrl: purchase?.shopUrl ?? null,
    isArchived:
      purchases.length > 0 && purchases.every((item) => item.isArchived),
  }
}

export const getBeanCollection = journalRead('beans/getBeanCollection')
  .validator(beanListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const search = data.query
      ? or(
          caseInsensitiveLike(beans.name, pattern),
          caseInsensitiveLike(beans.origin, pattern),
          caseInsensitiveLike(beans.roaster, pattern),
        )
      : undefined

    async function loadArchiveState(
      isArchived: boolean,
      requestedPage: number,
    ) {
      const pageSize = isArchived
        ? ARCHIVED_BEANS_PAGE_SIZE
        : ACTIVE_BEANS_PAGE_SIZE
      const activePurchase = exists(
        db
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
          ),
      )
      const archiveState = isArchived ? not(activePurchase) : activePurchase
      const where = search ? and(archiveState, search) : archiveState
      const countRows = await db
        .select({ value: count() })
        .from(beans)
        .where(owned(beans, where))
      const totalItems = countRows[0]?.value ?? 0
      const pagination = resolvePagination(totalItems, requestedPage, pageSize)
      const { page } = pagination
      const items = await db.query.beans.findMany({
        where: owned(beans, where),
        orderBy: [desc(beans.createdAt), desc(beans.id)],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        with: {
          images: true,
          roasterRef: true,
          purchases: { orderBy: [desc(beanPurchases.createdAt)] },
        },
      })
      return { items, ...pagination }
    }

    async function includeWeightUsage<
      Bean extends {
        readonly purchases: readonly (typeof beanPurchases.$inferSelect)[]
      },
    >(items: readonly Bean[]) {
      const flattened = items.map(flattenBeanPurchase)
      const usage = await purchaseUsageById(
        flattened.flatMap((bean) => (bean.purchaseId ? [bean.purchaseId] : [])),
      )
      return items.map((bean) => ({
        ...flattenBeanPurchase(bean),
        usedWeightGrams:
          usage.get(flattenBeanPurchase(bean).purchaseId ?? 0) ?? '0',
      }))
    }

    const [activePage, archivedPage] = await Promise.all([
      loadArchiveState(false, data.activePage),
      loadArchiveState(true, data.archivedPage),
    ])
    const [bagCount] = await db
      .select({ value: count(beanPurchases.id) })
      .from(beanPurchases)
      .innerJoin(beans, eq(beanPurchases.beanId, beans.id))
      .where(owned(beanPurchases, search))
    const active = {
      ...activePage,
      items: await includeWeightUsage(activePage.items),
    }
    const archived = {
      ...archivedPage,
      items: await includeWeightUsage(archivedPage.items),
    }
    return {
      active,
      archived,
      totalItems: active.totalItems + archived.totalItems,
      totalBags: bagCount?.value ?? 0,
    }
  })

export const getBean = journalRead('beans/getBean')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    return db.query.beans
      .findFirst({
        where: owned(beans, eq(beans.id, id)),
        with: {
          images: true,
          roasterRef: true,
          purchases: {
            orderBy: [desc(beanPurchases.createdAt)],
            with: { shots: { columns: { doseGrams: true } } },
          },
        },
      })
      .then((bean) =>
        bean
          ? { ...flattenBeanPurchase(bean), purchases: bean.purchases }
          : undefined,
      )
  })

export const getActiveBeans = journalRead('beans/getActiveBeans').handler(
  async () => {
    const rows = await db.query.beans.findMany({
      where: owned(
        beans,
        exists(
          db
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
            ),
        ),
      ),
      orderBy: [desc(beans.createdAt)],
      with: {
        images: true,
        roasterRef: true,
        purchases: {
          where: eq(beanPurchases.isArchived, false),
          orderBy: [desc(beanPurchases.createdAt)],
        },
      },
    })
    return rows.map(flattenBeanPurchase)
  },
)

export const getActiveBeanPurchases = journalRead(
  'beans/getActiveBeanPurchases',
).handler(async () => {
  const rows = await db.query.beanPurchases.findMany({
    where: owned(beanPurchases, eq(beanPurchases.isArchived, false)),
    orderBy: [desc(beanPurchases.createdAt)],
    with: {
      images: true,
      bean: { with: { roasterRef: true } },
    },
  })
  const usage = await purchaseUsageById(rows.map((row) => row.id))
  return rows.map((purchase) => ({
    ...purchase.bean,
    images: purchase.images,
    purchaseId: purchase.id,
    roastDate: purchase.roastDate,
    weight: purchase.initialWeightGrams,
    price: purchase.price,
    priceCurrency: purchase.priceCurrency,
    shopName: purchase.shopName,
    shopUrl: purchase.shopUrl,
    isArchived: purchase.isArchived,
    usedWeightGrams: usage.get(purchase.id) ?? '0',
  }))
})

export const createBean = journalWrite('beans/createBean')
  .validator(beanCreateSchema.superRefine(checkAltitudeRange))
  .handler(async ({ data }) => {
    const {
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
    const purchase = await createBeanPurchaseMutations(id, {
      roastDate,
      initialWeightGrams: weight,
      price,
      priceCurrency,
      shopName,
      shopUrl,
      isArchived,
    })
    await runJournalMutations([
      {
        statement: db
          .insert(beans)
          .values(journalInsertValues({ id, ...profile }))
          .getSQL(),
      },
      ...purchase.mutations,
    ])
    const savedBean = expectReturnedRow(
      await db.query.beans.findFirst({
        where: owned(beans, eq(beans.id, id)),
      }),
      'Bean',
    )
    return { ...savedBean, purchaseId: purchase.id }
  })

export const updateBean = journalWrite('beans/updateBean')
  .validator(beanUpdateSchema.superRefine(checkAltitudeRange))
  .handler(async ({ data }) => {
    const {
      id,
      roastDate: _roastDate,
      weight: _weight,
      price: _price,
      priceCurrency: _priceCurrency,
      shopName: _shopName,
      shopUrl: _shopUrl,
      isArchived,
      ...values
    } = data
    await runJournalMutations([
      {
        statement: db
          .update(beans)
          .set({ ...values, updatedAt: journalNow() })
          .where(owned(beans, eq(beans.id, id)))
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Bean not found',
      },
      ...(isArchived === undefined
        ? []
        : [
            {
              statement: db
                .update(beanPurchases)
                .set({ isArchived, updatedAt: journalNow() })
                .where(owned(beanPurchases, eq(beanPurchases.beanId, id)))
                .getSQL(),
            },
          ]),
    ])
    return expectReturnedRow(
      await db.query.beans.findFirst({
        where: owned(beans, eq(beans.id, id)),
      }),
      'Bean',
    )
  })

export const deleteBean = journalWrite('beans/deleteBean')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [brew, recipe, visit] = await Promise.all([
      db.query.shots.findFirst({
        where: owned(shots, eq(shots.beanId, id)),
        columns: { id: true },
      }),
      db.query.recipes.findFirst({
        where: owned(recipes, eq(recipes.beanId, id)),
        columns: { id: true },
      }),
      db.query.cafeVisits.findFirst({
        where: owned(cafeVisits, eq(cafeVisits.beanId, id)),
        columns: { id: true },
      }),
    ])
    if (brew || recipe || visit) {
      await db
        .update(beanPurchases)
        .set({ isArchived: true, updatedAt: journalNow() })
        .where(owned(beanPurchases, eq(beanPurchases.beanId, id)))
      return { archived: true }
    }
    await db
      .delete(beanPurchases)
      .where(owned(beanPurchases, eq(beanPurchases.beanId, id)))
    await deleteEntityWithMedia('beans', id)
    return { archived: false }
  })
