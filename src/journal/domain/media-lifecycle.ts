import { eq, lte, type SQL, sql } from 'drizzle-orm'
import {
  beanImages,
  beans,
  cafeVisitImages,
  cafeVisits,
  coffeeShopImages,
  coffeeShops,
  gear,
  gearImages,
  mediaCleanupJobs,
  shotImages,
  shots,
} from '@/db/schema'
import {
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
  runJournalMutations,
} from '@/journal/platform/database'
import { getStorage } from '@/journal/platform/storage'
import { getStoredImagePaths } from '@/lib/image-path'

export type MediaEntityType =
  | 'beans'
  | 'gear'
  | 'coffee-shops'
  | 'shots'
  | 'visits'

export function queueMediaCleanup(
  originalPaths: readonly string[],
): JournalMutation[] {
  const paths = getStoredImagePaths(originalPaths)
  const result: JournalMutation[] = []
  for (let offset = 0; offset < paths.length; offset += 20)
    result.push({
      statement: db
        .insert(mediaCleanupJobs)
        .values(
          journalInsertValues(
            paths
              .slice(offset, offset + 20)
              .map((storagePath) => ({ storagePath })),
          ),
        )
        .onConflictDoNothing({
          target: [mediaCleanupJobs.ownerId, mediaCleanupJobs.storagePath],
        })
        .getSQL(),
    })
  return result
}

const MEDIA_CLEANUP_BASE_RETRY_MS = 60_000
const MEDIA_CLEANUP_MAX_RETRY_MS = 24 * 60 * 60 * 1_000

export function mediaCleanupRetryDelay(attempts: number): number {
  const exponent = Math.max(0, Math.min(attempts - 1, 30))
  return Math.min(
    MEDIA_CLEANUP_BASE_RETRY_MS * 2 ** exponent,
    MEDIA_CLEANUP_MAX_RETRY_MS,
  )
}

export async function drainMediaCleanupQueue(limit = 50): Promise<void> {
  const now = new Date()
  const jobs = await db.query.mediaCleanupJobs.findMany({
    where: owned(mediaCleanupJobs, lte(mediaCleanupJobs.nextAttemptAt, now)),
    orderBy: (jobs, { asc }) => [asc(jobs.nextAttemptAt), asc(jobs.createdAt)],
    limit,
  })
  const storage = getStorage()

  for (const job of jobs) {
    try {
      if (await storage.exists(job.storagePath)) {
        await storage.delete(job.storagePath)
      }
      await db
        .delete(mediaCleanupJobs)
        .where(owned(mediaCleanupJobs, eq(mediaCleanupJobs.id, job.id)))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await db
        .update(mediaCleanupJobs)
        .set({
          attempts: sql`${mediaCleanupJobs.attempts} + 1`,
          lastError: message.slice(0, 2_000),
          nextAttemptAt: new Date(
            now.getTime() + mediaCleanupRetryDelay(job.attempts + 1),
          ),
          updatedAt: now,
        })
        .where(owned(mediaCleanupJobs, eq(mediaCleanupJobs.id, job.id)))
    }
  }
}

export async function cleanupUncommittedUpload(
  originalPath: string,
): Promise<void> {
  const storage = getStorage()
  const failedPaths: string[] = []

  for (const path of getStoredImagePaths([originalPath])) {
    try {
      if (await storage.exists(path)) await storage.delete(path)
    } catch {
      failedPaths.push(path)
    }
  }

  if (failedPaths.length > 0) {
    await db
      .insert(mediaCleanupJobs)
      .values(
        journalInsertValues(
          failedPaths.map((storagePath) => ({ storagePath })),
        ),
      )
      .onConflictDoNothing({
        target: [mediaCleanupJobs.ownerId, mediaCleanupJobs.storagePath],
      })
  }
}

function mediaEntity(entityType: MediaEntityType) {
  switch (entityType) {
    case 'beans':
      return { table: beans, images: beanImages, foreignKey: beanImages.beanId }
    case 'gear':
      return { table: gear, images: gearImages, foreignKey: gearImages.gearId }
    case 'coffee-shops':
      return {
        table: coffeeShops,
        images: coffeeShopImages,
        foreignKey: coffeeShopImages.coffeeShopId,
      }
    case 'shots':
      return { table: shots, images: shotImages, foreignKey: shotImages.shotId }
    case 'visits':
      return {
        table: cafeVisits,
        images: cafeVisitImages,
        foreignKey: cafeVisitImages.cafeVisitId,
      }
  }
}

export async function deleteEntityWithMedia(
  entityType: MediaEntityType,
  entityId: number,
  options: {
    readonly expectedRevision?: number
    readonly expectedUpdatedAt?: Date
    readonly idempotent?: boolean
  } = {},
): Promise<void> {
  if (
    entityType !== 'shots' &&
    (options.expectedRevision !== undefined ||
      options.expectedUpdatedAt ||
      options.idempotent)
  )
    throw new Error('Revision-aware deletion is only supported for brews')
  const { table, images, foreignKey } = mediaEntity(entityType)
  const [current] = await db
    .select({ id: table.id })
    .from(table)
    .where(owned(table, eq(table.id, entityId)))
    .limit(1)
  if (!current) {
    if (options.idempotent) return
    throw new Error('Record not found')
  }
  const conditions: Array<SQL | undefined> = [eq(table.id, entityId)]
  if (entityType === 'shots') {
    if (options.expectedRevision !== undefined)
      conditions.push(eq(shots.revision, options.expectedRevision))
    else if (options.expectedUpdatedAt)
      conditions.push(eq(shots.updatedAt, options.expectedUpdatedAt))
  }
  const where = owned(table, ...conditions)
  const selected = owned(images, eq(foreignKey, entityId))
  // One insert per path column: some SQL engines cap a compound SELECT at five terms.
  const cleanups = [images.storagePath, images.originalStoragePath].map(
    (path) => {
      const base = sql`substr(${path}, 1, length(${path}) - case when ${path} like '%.webp' or ${path} like '%.jpeg' then 5 else 4 end)`
      const condition = sql`${selected} and ${path} is not null`
      // Select and enqueue paths inside the write batch, so an upload cannot enter
      // between the path snapshot and the cascading parent deletion.
      return {
        statement: sql`insert into ${mediaCleanupJobs} (owner_id, storage_path)
    select ${images.ownerId}, ${path} from ${images} where ${condition}
    union all select ${images.ownerId}, ${base} || '.thumb.webp' from ${images} where ${condition}
    union all select ${images.ownerId}, ${base} || '.small.webp' from ${images} where ${condition}
    on conflict(owner_id, storage_path) do nothing`,
      }
    },
  )
  await runJournalMutations([
    {
      statement: db
        .update(table)
        .set({ updatedAt: sql`${table.updatedAt}` })
        .where(where)
        .getSQL(),
      expectedChanges: 1,
      conflictMessage:
        'This record changed on the server. Reload and try again.',
    },
    ...cleanups,
    { statement: db.delete(table).where(where).getSQL(), expectedChanges: 1 },
  ])
  await drainMediaCleanupQueue()
}
