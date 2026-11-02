import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, exists, ilike, not, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beanPurchases, beans, cafeVisits, recipes, shots } from '@/db/schema'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { BEAN_TYPE_VALUES, ROAST_LEVEL_VALUES } from '@/lib/domain-contracts'
import { expectReturnedRow } from '@/lib/domain-errors'
import {
  extractBeanInfoFromImages,
  isResearchEnabled,
  isVisionEnabled,
  researchBeanFromWeb,
} from '@/lib/server/ai-operations.server'
import {
  createBeanPurchaseOperation,
  newestPurchase,
  purchaseUsageById,
} from '@/lib/server/bean-purchases.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
  currencySchema,
  decimalStringSchema,
  imageBase64Schema,
  imageMimeTypeSchema,
  nameSchema,
  notesSchema,
  optionalPositiveIdSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'
import { createAiImage, validateImageBuffer } from '@/lib/thumbnail-image'
import type { ExtractedBeanInfo } from '@/modules/ai/read-models'

const beanTypeSchema = z.enum(BEAN_TYPE_VALUES)
const roastLevelSchema = z.enum(ROAST_LEVEL_VALUES)
const altitudeSchema = z.number().int().min(0).max(9_000)

function checkAltitudeRange(
  value: {
    readonly altitudeMinMeters?: number | null
    readonly altitudeMaxMeters?: number | null
  },
  context: z.RefinementCtx,
) {
  const { altitudeMinMeters: min, altitudeMaxMeters: max } = value
  if (min != null && max != null && min > max) {
    context.addIssue({
      code: 'custom',
      path: ['altitudeMaxMeters'],
      message: 'Maximum altitude must not be below the minimum.',
    })
  }
}

const beanCreateSchema = z.object({
  name: nameSchema,
  type: beanTypeSchema.optional(),
  isDecaf: z.boolean().optional(),
  roaster: shortTextSchema.optional(),
  roasterId: optionalPositiveIdSchema,
  origin: shortTextSchema.optional(),
  region: shortTextSchema.optional(),
  farm: shortTextSchema.optional(),
  variety: shortTextSchema.optional(),
  altitudeMinMeters: altitudeSchema.optional(),
  altitudeMaxMeters: altitudeSchema.optional(),
  process: shortTextSchema.optional(),
  roastLevel: roastLevelSchema.optional(),
  notes: notesSchema.optional(),
  roastDate: z.date().optional(),
  weight: decimalStringSchema.optional(),
  price: decimalStringSchema.optional(),
  priceCurrency: currencySchema.optional(),
  shopName: shortTextSchema.optional(),
  shopUrl: optionalUrlSchema,
  isArchived: z.boolean().optional(),
})

const beanUpdateSchema = beanCreateSchema.partial().extend({
  id: positiveIdSchema,
  type: beanTypeSchema.nullable().optional(),
  roaster: shortTextSchema.nullable().optional(),
  roasterId: positiveIdSchema.nullable().optional(),
  origin: shortTextSchema.nullable().optional(),
  region: shortTextSchema.nullable().optional(),
  farm: shortTextSchema.nullable().optional(),
  variety: shortTextSchema.nullable().optional(),
  altitudeMinMeters: altitudeSchema.nullable().optional(),
  altitudeMaxMeters: altitudeSchema.nullable().optional(),
  process: shortTextSchema.nullable().optional(),
  roastLevel: roastLevelSchema.nullable().optional(),
  notes: notesSchema.nullable().optional(),
})

const extractBeanInfoSchema = z.object({
  images: z
    .array(
      z.object({
        imageBase64: imageBase64Schema,
        mimeType: imageMimeTypeSchema,
      }),
    )
    .min(1)
    .max(6),
})

const researchBeanInfoSchema = z.object({
  beanName: nameSchema,
  roasterName: nameSchema.optional(),
  knownContext: z
    .object({
      type: beanTypeSchema.optional(),
      isDecaf: z.boolean().optional(),
      origin: shortTextSchema.optional(),
      region: shortTextSchema.optional(),
      farm: shortTextSchema.optional(),
      variety: shortTextSchema.optional(),
      altitudeMinMeters: altitudeSchema.optional(),
      altitudeMaxMeters: altitudeSchema.optional(),
      process: shortTextSchema.optional(),
      roastLevel: roastLevelSchema.optional(),
      roastDate: shortTextSchema.optional(),
      shopUrl: z.string().trim().max(2_048).optional(),
      notes: notesSchema.optional(),
    })
    .optional(),
})

const ACTIVE_BEANS_PAGE_SIZE = 12
const ARCHIVED_BEANS_PAGE_SIZE = 24
const beanListSchema = z.object({
  activePage: z.number().int().min(1).max(100_000).default(1),
  archivedPage: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})

export const getBeans = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.query.beans.findMany({
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

export const getBeanCollection = createServerFn({ method: 'GET' })
  .validator(beanListSchema)
  .handler(async ({ data }) => {
    const pattern = escapedContainsPattern(data.query)
    const search = data.query
      ? or(
          ilike(beans.name, pattern),
          ilike(beans.origin, pattern),
          ilike(beans.roaster, pattern),
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
            and(
              eq(beanPurchases.beanId, beans.id),
              eq(beanPurchases.isArchived, false),
            ),
          ),
      )
      const archiveState = isArchived ? not(activePurchase) : activePurchase
      const where = search ? and(archiveState, search) : archiveState
      const countRows = await db
        .select({ value: count() })
        .from(beans)
        .where(where)
      const totalItems = countRows[0]?.value ?? 0
      const pagination = resolvePagination(totalItems, requestedPage, pageSize)
      const { page } = pagination
      const items = await db.query.beans.findMany({
        where,
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
      .where(search)
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

export const getBean = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    return db.query.beans
      .findFirst({
        where: eq(beans.id, id),
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

export const getActiveBeans = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db.query.beans.findMany({
      where: exists(
        db
          .select({ id: beanPurchases.id })
          .from(beanPurchases)
          .where(
            and(
              eq(beanPurchases.beanId, beans.id),
              eq(beanPurchases.isArchived, false),
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

export const getActiveBeanPurchases = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db.query.beanPurchases.findMany({
      where: eq(beanPurchases.isArchived, false),
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
  },
)

export const createBean = createServerFn({ method: 'POST' })
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
    return db.transaction(async (tx) => {
      const [bean] = await tx.insert(beans).values(profile).returning()
      const savedBean = expectReturnedRow(bean, 'Bean')
      const purchase = await createBeanPurchaseOperation(tx, savedBean.id, {
        roastDate,
        initialWeightGrams: weight,
        price,
        priceCurrency,
        shopName,
        shopUrl,
        isArchived,
      })
      return { ...savedBean, purchaseId: purchase.id }
    })
  })

export const updateBean = createServerFn({ method: 'POST' })
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
    return db.transaction(async (tx) => {
      const [bean] = await tx
        .update(beans)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(beans.id, id))
        .returning()
      if (isArchived !== undefined) {
        await tx
          .update(beanPurchases)
          .set({ isArchived, updatedAt: new Date() })
          .where(eq(beanPurchases.beanId, id))
      }
      return expectReturnedRow(bean, 'Bean')
    })
  })

export const deleteBean = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [brew, recipe, visit] = await Promise.all([
      db.query.shots.findFirst({
        where: eq(shots.beanId, id),
        columns: { id: true },
      }),
      db.query.recipes.findFirst({
        where: eq(recipes.beanId, id),
        columns: { id: true },
      }),
      db.query.cafeVisits.findFirst({
        where: eq(cafeVisits.beanId, id),
        columns: { id: true },
      }),
    ])
    if (brew || recipe || visit) {
      await db
        .update(beanPurchases)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(beanPurchases.beanId, id))
      return { archived: true }
    }
    await db.delete(beanPurchases).where(eq(beanPurchases.beanId, id))
    await deleteEntityWithMedia('beans', id)
    return { archived: false }
  })

export const checkVisionEnabled = createServerFn({ method: 'GET' }).handler(
  async () => {
    return { enabled: await isVisionEnabled() }
  },
)

export const extractBeanInfo = createServerFn({ method: 'POST' })
  .validator(extractBeanInfoSchema)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!(await isVisionEnabled())) {
      throw new Error('Connect your AI provider in Settings > AI')
    }
    const aiImages = await Promise.all(
      data.images.map(async ({ imageBase64, mimeType }) => {
        const image = Buffer.from(imageBase64, 'base64')
        await validateImageBuffer(image, mimeType)
        return (await createAiImage(image)).toString('base64')
      }),
    )
    return withResourceLimits('bean-image-extraction', () =>
      extractBeanInfoFromImages(aiImages, 'image/jpeg'),
    )
  })

export const checkResearchEnabled = createServerFn({ method: 'GET' }).handler(
  async () => {
    return { enabled: await isResearchEnabled() }
  },
)

export const researchBeanInfo = createServerFn({ method: 'POST' })
  .validator(researchBeanInfoSchema)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!(await isResearchEnabled())) {
      throw new Error(
        'Connect a provider with Responses API web search in Settings > AI',
      )
    }

    console.info('[Bean research] request', {
      beanName: data.beanName,
      roasterName: data.roasterName ?? null,
    })

    return withResourceLimits('bean-web-research', () =>
      researchBeanFromWeb(data.beanName, data.roasterName, data.knownContext),
    )
  })
