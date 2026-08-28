import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, shots } from '@/db/schema'
import {
  type ExtractedBeanInfo,
  extractBeanInfoFromImage,
  isResearchEnabled,
  isVisionEnabled,
  researchBeanFromWeb,
} from '@/lib/ai'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { BEAN_TYPE_VALUES, ROAST_LEVEL_VALUES } from '@/lib/domain-contracts'
import { expectReturnedRow } from '@/lib/domain-errors'
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

const beanTypeSchema = z.enum(BEAN_TYPE_VALUES)
const roastLevelSchema = z.enum(ROAST_LEVEL_VALUES)

const beanCreateSchema = z.object({
  name: nameSchema,
  type: beanTypeSchema.optional(),
  roaster: shortTextSchema.optional(),
  roasterId: optionalPositiveIdSchema,
  origin: shortTextSchema.optional(),
  region: shortTextSchema.optional(),
  farm: shortTextSchema.optional(),
  variety: shortTextSchema.optional(),
  process: shortTextSchema.optional(),
  roastLevel: roastLevelSchema.optional(),
  roastDate: z.date().optional(),
  weight: decimalStringSchema.optional(),
  price: decimalStringSchema.optional(),
  priceCurrency: currencySchema.optional(),
  shopUrl: optionalUrlSchema,
  notes: notesSchema.optional(),
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
  process: shortTextSchema.nullable().optional(),
  roastLevel: roastLevelSchema.nullable().optional(),
  roastDate: z.date().nullable().optional(),
  weight: decimalStringSchema.nullable().optional(),
  price: decimalStringSchema.nullable().optional(),
  priceCurrency: currencySchema.nullable().optional(),
  shopUrl: z
    .union([z.url().max(2_048), z.literal('')])
    .nullable()
    .optional(),
  notes: notesSchema.nullable().optional(),
  isArchived: z.boolean().optional(),
})

const extractBeanInfoSchema = z.object({
  imageBase64: imageBase64Schema,
  mimeType: imageMimeTypeSchema,
})

const researchBeanInfoSchema = z.object({
  beanName: nameSchema,
  roasterName: nameSchema.optional(),
  knownContext: z
    .object({
      type: beanTypeSchema.optional(),
      origin: shortTextSchema.optional(),
      region: shortTextSchema.optional(),
      farm: shortTextSchema.optional(),
      variety: shortTextSchema.optional(),
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
  return db.query.beans.findMany({
    orderBy: [desc(beans.createdAt)],
    with: {
      images: true,
      roasterRef: true,
    },
  })
})

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
      const where = search
        ? and(eq(beans.isArchived, isArchived), search)
        : eq(beans.isArchived, isArchived)
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
        with: { images: true, roasterRef: true },
      })
      return { items, ...pagination }
    }

    async function includeWeightUsage<Bean extends { readonly id: number }>(
      items: readonly Bean[],
    ) {
      if (items.length === 0) return items
      const usage = await db
        .select({
          beanId: shots.beanId,
          usedWeightGrams: sql<string>`coalesce(sum(${shots.doseGrams}), 0)::text`,
        })
        .from(shots)
        .where(
          inArray(
            shots.beanId,
            items.map((bean) => bean.id),
          ),
        )
        .groupBy(shots.beanId)
      const usedWeightByBeanId = new Map(
        usage.flatMap((row) =>
          row.beanId === null ? [] : [[row.beanId, row.usedWeightGrams]],
        ),
      )
      return items.map((bean) => ({
        ...bean,
        usedWeightGrams: usedWeightByBeanId.get(bean.id) ?? '0',
      }))
    }

    const [activePage, archived] = await Promise.all([
      loadArchiveState(false, data.activePage),
      loadArchiveState(true, data.archivedPage),
    ])
    const active = {
      ...activePage,
      items: await includeWeightUsage(activePage.items),
    }
    return {
      active,
      archived,
      totalItems: active.totalItems + archived.totalItems,
    }
  })

export const getBean = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    return db.query.beans.findFirst({
      where: eq(beans.id, id),
      with: {
        images: true,
        roasterRef: true,
      },
    })
  })

export const getActiveBeans = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.query.beans.findMany({
      where: eq(beans.isArchived, false),
      orderBy: [desc(beans.createdAt)],
      with: {
        images: true,
        roasterRef: true,
      },
    })
  },
)

export const createBean = createServerFn({ method: 'POST' })
  .validator(beanCreateSchema)
  .handler(async ({ data }) => {
    const [bean] = await db.insert(beans).values(data).returning()
    return expectReturnedRow(bean, 'Bean')
  })

export const updateBean = createServerFn({ method: 'POST' })
  .validator(beanUpdateSchema)
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [bean] = await db
      .update(beans)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(beans.id, id))
      .returning()
    return expectReturnedRow(bean, 'Bean')
  })

export const deleteBean = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => deleteEntityWithMedia('beans', id))

export const checkVisionEnabled = createServerFn({ method: 'GET' }).handler(
  async () => {
    return { enabled: isVisionEnabled() }
  },
)

export const extractBeanInfo = createServerFn({ method: 'POST' })
  .validator(extractBeanInfoSchema)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!isVisionEnabled()) {
      throw new Error('OpenAI vision is not configured')
    }
    const image = Buffer.from(data.imageBase64, 'base64')
    await validateImageBuffer(image, data.mimeType)
    const aiImage = await createAiImage(image)
    return withResourceLimits('bean-image-extraction', () =>
      extractBeanInfoFromImage(aiImage.toString('base64'), 'image/jpeg'),
    )
  })

export const checkResearchEnabled = createServerFn({ method: 'GET' }).handler(
  async () => {
    return { enabled: isResearchEnabled() }
  },
)

export const researchBeanInfo = createServerFn({ method: 'POST' })
  .validator(researchBeanInfoSchema)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!isResearchEnabled()) {
      throw new Error('OpenAI research is not configured')
    }

    console.info('[Bean research] request', {
      beanName: data.beanName,
      roasterName: data.roasterName ?? null,
    })

    return withResourceLimits('bean-web-research', () =>
      researchBeanFromWeb(data.beanName, data.roasterName, data.knownContext),
    )
  })
