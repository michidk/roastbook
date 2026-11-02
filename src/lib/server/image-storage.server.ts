import '@tanstack/react-start/server-only'
import { count, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { owned } from '@/db/journal-scope.server'
import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  shotImages,
} from '@/db/schema'
import { getServerEnv } from '@/lib/env.server'
import { getStoredImagePaths } from '@/lib/image-path'
import { getStorage } from '@/lib/storage'

const imageTables = [
  beanImages,
  gearImages,
  coffeeShopImages,
  shotImages,
  cafeVisitImages,
] as const

export function imageStoragePolicy() {
  const env = getServerEnv()
  const limitMiB =
    env.IMAGE_STORAGE_LIMIT_MIB ?? (env.DEPLOYMENT_MODE === 'hosted' ? 250 : 0)
  return {
    maxImagesPerItem: env.IMAGE_MAX_PER_ITEM,
    limitBytes: limitMiB === 0 ? null : limitMiB * 1024 * 1024,
  }
}

/** Scalar subqueries run inside the same conditional INSERT as the quota check. */
export function imageStorageBytesSql() {
  return sql.join(
    imageTables.map(
      (table) =>
        sql`(select coalesce(sum(coalesce(${table.storageBytes}, ${table.sizeBytes}, 0)), 0) from ${table} where ${owned(table)})`,
    ),
    sql` + `,
  )
}

export function imageStorageMeasuredSql() {
  return sql.join(
    imageTables.map(
      (table) =>
        sql`not exists(select 1 from ${table} where ${owned(table, isNull(table.storageBytes))})`,
    ),
    sql` and `,
  )
}

/** Older uploads are measured in bounded pages, without scanning a shared bucket. */
export async function measureLegacyImageStorage(limit = 6): Promise<void> {
  const storage = getStorage()
  let remaining = limit
  for (const table of imageTables) {
    if (!remaining) break
    const rows = await db
      .select({ id: table.id, storagePath: table.storagePath })
      .from(table)
      .where(owned(table, isNull(table.storageBytes)))
      .limit(remaining)
    for (const row of rows) {
      const objects = await Promise.all(
        getStoredImagePaths([row.storagePath]).map((path) =>
          storage.stat(path),
        ),
      )
      const storageBytes = objects.reduce(
        (sum, object) => sum + (object?.sizeBytes ?? 0),
        0,
      )
      await db
        .update(table)
        .set({ storageBytes })
        .where(owned(table, eq(table.id, row.id), isNull(table.storageBytes)))
      remaining--
    }
  }
}

export async function loadImageStorageUsage() {
  const groups = await Promise.all(
    imageTables.map((table) =>
      db
        .select({
          images: count(),
          bytes: sql<number>`coalesce(sum(coalesce(${table.storageBytes}, ${table.sizeBytes}, 0)), 0)`,
          unmeasured: sql<number>`coalesce(sum(case when ${table.storageBytes} is null then 1 else 0 end), 0)`,
        })
        .from(table)
        .where(owned(table)),
    ),
  )
  return groups.flat().reduce(
    (total, group) => ({
      imageCount: total.imageCount + Number(group.images),
      totalBytes: total.totalBytes + Number(group.bytes),
      unmeasuredImages: total.unmeasuredImages + Number(group.unmeasured),
    }),
    { imageCount: 0, totalBytes: 0, unmeasuredImages: 0 },
  )
}
