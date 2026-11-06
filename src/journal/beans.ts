import { and, count, desc, eq, exists, inArray, not, or } from 'drizzle-orm'
import {
  beanPurchases,
  beans,
  beanTagAssignments,
  cafeVisits,
  recipes,
  shots,
} from '@/db/schema'
import {
  beanRatings,
  createBeanMutations,
  replaceBeanTags,
  shelfCondition,
} from '@/journal/domain/bean-library'
import {
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
import { db, owned, runJournalMutations } from '@/journal/platform/database'
import { trackEvent } from '@/journal/platform/effects'
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
  return enrichBeans(rows)
})

function flattenBeanPurchase<
  Bean extends {
    readonly alwaysOnShelf: boolean
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
      !bean.alwaysOnShelf && purchases.every((item) => item.isArchived),
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
      const onShelf = shelfCondition()
      const archiveState = isArchived ? not(onShelf) : onShelf
      const tagFilter = data.tagId
        ? exists(
            db
              .select({ id: beanTagAssignments.tagId })
              .from(beanTagAssignments)
              .where(
                owned(
                  beanTagAssignments,
                  and(
                    eq(beanTagAssignments.beanId, beans.id),
                    eq(beanTagAssignments.tagId, data.tagId),
                  ),
                ),
              ),
          )
        : undefined
      const where = and(archiveState, search, tagFilter)
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
        readonly id: number
        readonly rating: number | null
        readonly alwaysOnShelf: boolean
        readonly purchases: readonly (typeof beanPurchases.$inferSelect)[]
      },
    >(items: readonly Bean[]) {
      const flattened = items.map(flattenBeanPurchase)
      const usage = await purchaseUsageById(
        flattened.flatMap((bean) => (bean.purchaseId ? [bean.purchaseId] : [])),
      )
      return (await enrichBeans(items)).map((bean) => ({
        ...bean,
        usedWeightGrams: usage.get(bean.purchaseId ?? 0) ?? '0',
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
      .then(async (bean) => {
        if (!bean) return undefined
        const [enriched] = await enrichBeans([bean])
        if (!enriched) return undefined
        return { ...enriched, purchases: bean.purchases }
      })
  })

export const getActiveBeans = journalRead('beans/getActiveBeans').handler(
  async () => {
    const rows = await db.query.beans.findMany({
      where: owned(beans, shelfCondition()),
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
    return enrichBeans(rows)
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
  const purchases = rows.map((purchase) => ({
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
  const profiles = await enrichBeans(
    await db.query.beans.findMany({
      where: owned(beans),
      orderBy: [desc(beans.alwaysOnShelf), desc(beans.createdAt)],
      with: {
        images: true,
        roasterRef: true,
        purchases: { orderBy: [desc(beanPurchases.createdAt)] },
      },
    }),
  )
  return [
    ...purchases,
    ...profiles
      .filter((bean) => !rows.some((purchase) => purchase.beanId === bean.id))
      .map((bean) => ({ ...bean, purchaseId: null, usedWeightGrams: '0' })),
  ]
})

export const createBean = journalWrite('beans/createBean')
  .validator(beanCreateSchema.superRefine(checkAltitudeRange))
  .handler(async ({ data }) => {
    const created = await createBeanMutations(data)
    await runJournalMutations(created.mutations)
    const savedBean = expectReturnedRow(
      await db.query.beans.findFirst({
        where: owned(beans, eq(beans.id, created.id)),
      }),
      'Bean',
    )
    trackEvent('bean_created')
    return { ...savedBean, purchaseId: created.purchaseId }
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
      createBag: _createBag,
      beanTagIds,
      ...values
    } = data
    await runJournalMutations([
      {
        statement: db
          .update(beans)
          .set({
            ...values,
            ...(isArchived === true
              ? { alwaysOnShelf: false }
              : isArchived === false
                ? { alwaysOnShelf: true }
                : {}),
            updatedAt: journalNow(),
          })
          .where(owned(beans, eq(beans.id, id)))
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Bean not found',
      },
      ...(beanTagIds === undefined
        ? []
        : await replaceBeanTags(id, beanTagIds)),
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
      await runJournalMutations([
        {
          statement: db
            .update(beans)
            .set({ alwaysOnShelf: false, updatedAt: journalNow() })
            .where(owned(beans, eq(beans.id, id)))
            .getSQL(),
          expectedChanges: 1,
          conflictMessage: 'Bean not found',
        },
        {
          statement: db
            .update(beanPurchases)
            .set({ isArchived: true, updatedAt: journalNow() })
            .where(owned(beanPurchases, eq(beanPurchases.beanId, id)))
            .getSQL(),
        },
      ])
      return { archived: true }
    }
    await db
      .delete(beanPurchases)
      .where(owned(beanPurchases, eq(beanPurchases.beanId, id)))
    await deleteEntityWithMedia('beans', id)
    return { archived: false }
  })

async function enrichBeans<
  Bean extends {
    id: number
    alwaysOnShelf: boolean
    rating: number | null
    purchases: readonly (typeof beanPurchases.$inferSelect)[]
  },
>(rows: readonly Bean[]) {
  const ratings = await beanRatings(rows.map((bean) => bean.id))
  const assignments = rows.length
    ? await db.query.beanTagAssignments.findMany({
        where: owned(
          beanTagAssignments,
          inArray(
            beanTagAssignments.beanId,
            rows.map((bean) => bean.id),
          ),
        ),
        with: { tag: true },
      })
    : []
  return rows.map((bean) => {
    const derived = ratings.get(bean.id) ?? {
      averageRating: null,
      ratedBrewCount: 0,
    }
    return {
      ...flattenBeanPurchase(bean),
      ...derived,
      effectiveRating: bean.rating ?? derived.averageRating,
      tags: assignments
        .filter((item) => item.beanId === bean.id)
        .map((item) => item.tag),
    }
  })
}
