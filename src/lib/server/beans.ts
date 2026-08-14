import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans } from '@/db/schema'
import {
  type ExtractedBeanInfo,
  extractBeanInfoFromImage,
  isResearchEnabled,
  isVisionEnabled,
  researchBeanFromWeb,
} from '@/lib/ai'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
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
import { validateImageBuffer } from '@/lib/thumbnail-image'

const beanTypeSchema = z.enum(['espresso', 'filter', 'decaf'])
const roastLevelSchema = z.enum([
  'light',
  'medium_light',
  'medium',
  'medium_dark',
  'dark',
])

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
  priceCurrency: z.string().trim().length(3).optional(),
  shopUrl: optionalUrlSchema,
  notes: notesSchema.optional(),
})

const beanUpdateSchema = beanCreateSchema.partial().extend({
  id: positiveIdSchema,
  type: beanTypeSchema.nullable().optional(),
  roasterId: positiveIdSchema.nullable().optional(),
  roastLevel: roastLevelSchema.nullable().optional(),
  roastDate: z.date().nullable().optional(),
  weight: decimalStringSchema.nullable().optional(),
  price: decimalStringSchema.nullable().optional(),
  priceCurrency: z.string().trim().length(3).nullable().optional(),
  shopUrl: z
    .union([z.url().max(2_048), z.literal('')])
    .nullable()
    .optional(),
  isArchived: z.boolean().optional(),
})

const extractBeanInfoSchema = z.object({
  imageBase64: imageBase64Schema,
  mimeType: imageMimeTypeSchema,
})

const researchBeanInfoSchema = z.object({
  beanName: nameSchema,
  roasterName: nameSchema.optional(),
})

const BEANS_PAGE_SIZE = 12
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
    const search = data.query
      ? or(
          ilike(beans.name, `%${data.query}%`),
          ilike(beans.origin, `%${data.query}%`),
          ilike(beans.roaster, `%${data.query}%`),
        )
      : undefined

    async function loadArchiveState(
      isArchived: boolean,
      requestedPage: number,
    ) {
      const where = search
        ? and(eq(beans.isArchived, isArchived), search)
        : eq(beans.isArchived, isArchived)
      const [{ value: totalItems }] = await db
        .select({ value: count() })
        .from(beans)
        .where(where)
      const totalPages = Math.max(1, Math.ceil(totalItems / BEANS_PAGE_SIZE))
      const page = Math.min(requestedPage, totalPages)
      const items = await db.query.beans.findMany({
        where,
        orderBy: [desc(beans.createdAt), desc(beans.id)],
        limit: BEANS_PAGE_SIZE,
        offset: (page - 1) * BEANS_PAGE_SIZE,
        with: { images: true, roasterRef: true },
      })
      return { items, page, pageSize: BEANS_PAGE_SIZE, totalItems, totalPages }
    }

    const [active, archived] = await Promise.all([
      loadArchiveState(false, data.activePage),
      loadArchiveState(true, data.archivedPage),
    ])
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
    return bean
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
    return bean
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
    return withResourceLimits('bean-image-extraction', () =>
      extractBeanInfoFromImage(data.imageBase64, data.mimeType),
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
      researchBeanFromWeb(data.beanName, data.roasterName),
    )
  })
