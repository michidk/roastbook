import { eq, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
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
import { expectReturnedRow } from '@/lib/domain-errors'
import { getStoredImagePaths } from '@/lib/image-path'
import { getStorage } from '@/lib/storage'

export type MediaEntityType =
  | 'beans'
  | 'gear'
  | 'coffee-shops'
  | 'shots'
  | 'visits'

export type DatabaseTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export async function queueMediaCleanup(
  tx: DatabaseTransaction,
  originalPaths: readonly string[],
): Promise<void> {
  const paths = getStoredImagePaths(originalPaths)
  if (paths.length === 0) return

  await tx
    .insert(mediaCleanupJobs)
    .values(paths.map((storagePath) => ({ storagePath })))
    .onConflictDoNothing({ target: mediaCleanupJobs.storagePath })
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
    where: lte(mediaCleanupJobs.nextAttemptAt, now),
    orderBy: (jobs, { asc }) => [asc(jobs.nextAttemptAt), asc(jobs.createdAt)],
    limit,
  })
  const storage = getStorage()

  for (const job of jobs) {
    try {
      if (await storage.exists(job.storagePath)) {
        await storage.delete(job.storagePath)
      }
      await db.delete(mediaCleanupJobs).where(eq(mediaCleanupJobs.id, job.id))
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
        .where(eq(mediaCleanupJobs.id, job.id))
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
      .values(failedPaths.map((storagePath) => ({ storagePath })))
      .onConflictDoNothing({ target: mediaCleanupJobs.storagePath })
  }
}

async function selectEntityImagePaths(
  tx: DatabaseTransaction,
  entityType: MediaEntityType,
  entityId: number,
): Promise<string[]> {
  switch (entityType) {
    case 'beans':
      return (
        await tx
          .select({ storagePath: beanImages.storagePath })
          .from(beanImages)
          .where(eq(beanImages.beanId, entityId))
      ).map((image) => image.storagePath)
    case 'gear':
      return (
        await tx
          .select({ storagePath: gearImages.storagePath })
          .from(gearImages)
          .where(eq(gearImages.gearId, entityId))
      ).map((image) => image.storagePath)
    case 'coffee-shops':
      return (
        await tx
          .select({ storagePath: coffeeShopImages.storagePath })
          .from(coffeeShopImages)
          .where(eq(coffeeShopImages.coffeeShopId, entityId))
      ).map((image) => image.storagePath)
    case 'shots':
      return (
        await tx
          .select({ storagePath: shotImages.storagePath })
          .from(shotImages)
          .where(eq(shotImages.shotId, entityId))
      ).map((image) => image.storagePath)
    case 'visits':
      return (
        await tx
          .select({ storagePath: cafeVisitImages.storagePath })
          .from(cafeVisitImages)
          .where(eq(cafeVisitImages.cafeVisitId, entityId))
      ).map((image) => image.storagePath)
  }
}

async function deleteEntityRow(
  tx: DatabaseTransaction,
  entityType: MediaEntityType,
  entityId: number,
): Promise<void> {
  switch (entityType) {
    case 'beans':
      expectReturnedRow(
        (
          await tx
            .delete(beans)
            .where(eq(beans.id, entityId))
            .returning({ id: beans.id })
        )[0],
        'Bean',
      )
      return
    case 'gear':
      expectReturnedRow(
        (
          await tx
            .delete(gear)
            .where(eq(gear.id, entityId))
            .returning({ id: gear.id })
        )[0],
        'Gear',
      )
      return
    case 'coffee-shops':
      expectReturnedRow(
        (
          await tx
            .delete(coffeeShops)
            .where(eq(coffeeShops.id, entityId))
            .returning({ id: coffeeShops.id })
        )[0],
        'Café',
      )
      return
    case 'shots':
      expectReturnedRow(
        (
          await tx
            .delete(shots)
            .where(eq(shots.id, entityId))
            .returning({ id: shots.id })
        )[0],
        'Shot',
      )
      return
    case 'visits':
      expectReturnedRow(
        (
          await tx
            .delete(cafeVisits)
            .where(eq(cafeVisits.id, entityId))
            .returning({ id: cafeVisits.id })
        )[0],
        'Visit',
      )
  }
}

export async function deleteEntityWithMedia(
  entityType: MediaEntityType,
  entityId: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const paths = await selectEntityImagePaths(tx, entityType, entityId)
    await queueMediaCleanup(tx, paths)
    await deleteEntityRow(tx, entityType, entityId)
  })

  await drainMediaCleanupQueue()
}
