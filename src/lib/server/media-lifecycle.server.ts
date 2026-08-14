import { eq, sql } from 'drizzle-orm'
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

export async function drainMediaCleanupQueue(limit = 50): Promise<void> {
  const jobs = await db.query.mediaCleanupJobs.findMany({
    orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
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
          updatedAt: new Date(),
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
      await tx.delete(beans).where(eq(beans.id, entityId))
      return
    case 'gear':
      await tx.delete(gear).where(eq(gear.id, entityId))
      return
    case 'coffee-shops':
      await tx.delete(coffeeShops).where(eq(coffeeShops.id, entityId))
      return
    case 'shots':
      await tx.delete(shots).where(eq(shots.id, entityId))
      return
    case 'visits':
      await tx.delete(cafeVisits).where(eq(cafeVisits.id, entityId))
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
