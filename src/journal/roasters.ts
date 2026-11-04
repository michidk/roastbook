import { asc, count, desc, eq, sql } from 'drizzle-orm'
import { beans, roasters } from '@/db/schema'
import { caseInsensitiveLike } from '@/journal/domain/portable-query'
import { journalRead, journalWrite } from '@/journal/function'
import {
  roasterCreateSchema,
  roasterListSchema,
  roasterUpdateSchema,
} from '@/journal/input/roasters'
import { db, journalInsertValues, owned } from '@/journal/platform/database'
import {
  deleteWebsiteFaviconBestEffort,
  refreshWebsiteFaviconBestEffort,
} from '@/journal/platform/effects'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import { positiveIdSchema } from '@/lib/server-validation'

const ROASTERS_PAGE_SIZE = 25

export const getRoasters = journalRead('roasters/getRoasters').handler(
  async () => {
    return db.query.roasters.findMany({
      where: owned(roasters),
      orderBy: [desc(roasters.createdAt)],
      with: {
        beans: true,
      },
    })
  },
)

export const getRoasterPage = journalRead('roasters/getRoasterPage')
  .validator(roasterListSchema)
  .handler(async ({ data }) => {
    const where = data.query
      ? caseInsensitiveLike(roasters.name, escapedContainsPattern(data.query))
      : undefined
    const countRows = await db
      .select({ value: count() })
      .from(roasters)
      .where(owned(roasters, where))
    const totalItems = countRows[0]?.value ?? 0
    const pagination = resolvePagination(
      totalItems,
      data.page,
      ROASTERS_PAGE_SIZE,
    )
    const { page } = pagination
    const beanCount = sql<number>`count(${beans.id})`
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
      .where(owned(roasters, where))
      .groupBy(roasters.id)
      .orderBy(order, asc(roasters.id))
      .limit(ROASTERS_PAGE_SIZE)
      .offset((page - 1) * ROASTERS_PAGE_SIZE)

    return { items, ...pagination }
  })

export const getRoaster = journalRead('roasters/getRoaster')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.query.roasters.findFirst({
      where: owned(roasters, eq(roasters.id, id)),
      with: {
        beans: true,
      },
    }),
  )

export const createRoaster = journalWrite('roasters/createRoaster')
  .validator(roasterCreateSchema)
  .handler(async ({ data }) => {
    const [roaster] = await db
      .insert(roasters)
      .values(journalInsertValues(data))
      .returning()
    const created = expectReturnedRow(roaster, 'Roaster')
    await refreshWebsiteFaviconBestEffort({
      entityType: 'roasters',
      entityId: created.id,
      website: created.website,
    })
    return created
  })

export const updateRoaster = journalWrite('roasters/updateRoaster')
  .validator(roasterUpdateSchema)
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [roaster] = await db
      .update(roasters)
      .set({ ...values, updatedAt: new Date() })
      .where(owned(roasters, eq(roasters.id, id)))
      .returning()
    const updated = expectReturnedRow(roaster, 'Roaster')
    await refreshWebsiteFaviconBestEffort({
      entityType: 'roasters',
      entityId: updated.id,
      website: updated.website,
    })
    return updated
  })

export const deleteRoaster = journalWrite('roasters/deleteRoaster')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const [roaster] = await db
      .delete(roasters)
      .where(owned(roasters, eq(roasters.id, id)))
      .returning({ id: roasters.id })
    expectReturnedRow(roaster, 'Roaster')
    await deleteWebsiteFaviconBestEffort('roasters', id)
  })
