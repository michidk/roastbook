import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, roasters } from '@/db/schema'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import {
  isResearchEnabled,
  researchRoasterFromWeb,
} from '@/lib/server/ai-operations.server'
import {
  deleteWebsiteFaviconBestEffort,
  refreshWebsiteFaviconBestEffort,
} from '@/lib/server/favicon-cache.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
  nameSchema,
  notesSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'
import type { ExtractedRoasterInfo } from '@/modules/ai/read-models'

const roasterCreateSchema = z.object({
  name: nameSchema,
  location: shortTextSchema.optional(),
  country: shortTextSchema.optional(),
  website: optionalUrlSchema,
  instagramHandle: z.string().trim().max(100).optional(),
  notes: notesSchema.optional(),
})

const roasterUpdateSchema = roasterCreateSchema.partial().extend({
  id: positiveIdSchema,
  location: shortTextSchema.nullable().optional(),
  country: shortTextSchema.nullable().optional(),
  website: z
    .union([z.url().max(2_048), z.literal('')])
    .nullable()
    .optional(),
  instagramHandle: z.string().trim().max(100).nullable().optional(),
  notes: notesSchema.nullable().optional(),
})

const researchRoasterInfoSchema = z.object({
  name: nameSchema,
  knownContext: z
    .object({
      location: shortTextSchema.optional(),
      country: shortTextSchema.optional(),
      website: z.string().trim().max(2_048).optional(),
      instagramHandle: z.string().trim().max(100).optional(),
      notes: notesSchema.optional(),
    })
    .optional(),
})

const ROASTERS_PAGE_SIZE = 25
const roasterListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['name', 'location', 'beans']).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

export const getRoasters = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.query.roasters.findMany({
      orderBy: [desc(roasters.createdAt)],
      with: {
        beans: true,
      },
    })
  },
)

export const getRoasterPage = createServerFn({ method: 'GET' })
  .validator(roasterListSchema)
  .handler(async ({ data }) => {
    const where = data.query
      ? ilike(roasters.name, escapedContainsPattern(data.query))
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(roasters)
      .where(where)
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(
      totalItems,
      data.page,
      ROASTERS_PAGE_SIZE,
    )
    const { page } = pagination
    const beanCount = sql<number>`count(${beans.id})::int`
    const sortExpression =
      data.sort === 'beans'
        ? beanCount
        : data.sort === 'location'
          ? sql`coalesce(${roasters.location}, '') || coalesce(${roasters.country}, '')`
          : roasters.name
    const order =
      data.direction === 'asc' ? asc(sortExpression) : desc(sortExpression)
    const items = await db
      .select({
        id: roasters.id,
        name: roasters.name,
        location: roasters.location,
        country: roasters.country,
        website: roasters.website,
        updatedAt: roasters.updatedAt,
        notes: roasters.notes,
        beanCount,
      })
      .from(roasters)
      .leftJoin(beans, eq(beans.roasterId, roasters.id))
      .where(where)
      .groupBy(roasters.id)
      .orderBy(order, asc(roasters.id))
      .limit(ROASTERS_PAGE_SIZE)
      .offset((page - 1) * ROASTERS_PAGE_SIZE)

    return { items, ...pagination }
  })

export const getRoaster = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.query.roasters.findFirst({
      where: eq(roasters.id, id),
      with: {
        beans: true,
      },
    }),
  )

export const checkRoasterResearchEnabled = createServerFn({
  method: 'GET',
}).handler(async () => ({ enabled: isResearchEnabled() }))

export const researchRoasterInfo = createServerFn({ method: 'POST' })
  .validator(researchRoasterInfoSchema)
  .handler(async ({ data }): Promise<ExtractedRoasterInfo> => {
    if (!isResearchEnabled()) {
      throw new Error('OpenAI research is not configured')
    }

    return withResourceLimits('roaster-web-research', () =>
      researchRoasterFromWeb(data.name, data.knownContext),
    )
  })

export const createRoaster = createServerFn({ method: 'POST' })
  .validator(roasterCreateSchema)
  .handler(async ({ data }) => {
    const [roaster] = await db.insert(roasters).values(data).returning()
    const created = expectReturnedRow(roaster, 'Roaster')
    await refreshWebsiteFaviconBestEffort({
      entityType: 'roasters',
      entityId: created.id,
      website: created.website,
    })
    return created
  })

export const updateRoaster = createServerFn({ method: 'POST' })
  .validator(roasterUpdateSchema)
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [roaster] = await db
      .update(roasters)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(roasters.id, id))
      .returning()
    const updated = expectReturnedRow(roaster, 'Roaster')
    await refreshWebsiteFaviconBestEffort({
      entityType: 'roasters',
      entityId: updated.id,
      website: updated.website,
    })
    return updated
  })

export const deleteRoaster = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [roaster] = await db
      .delete(roasters)
      .where(eq(roasters.id, id))
      .returning({ id: roasters.id })
    expectReturnedRow(roaster, 'Roaster')
    await deleteWebsiteFaviconBestEffort('roasters', id)
  })
