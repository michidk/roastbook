import { createServerFn } from '@tanstack/react-start'
import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { getStoredImagePaths } from '@/lib/image-path'
import { getStorage } from '@/lib/storage'

const FAVICON_PREFIX = 'favicons/'

type StorageStats = {
  readonly available: boolean
  readonly provider: 'local' | 's3'
  readonly imageCount: number | null
  readonly faviconCount: number | null
  readonly totalBytes: number | null
}

async function loadStorageStats(): Promise<StorageStats> {
  if (DEMO_MODE) {
    return {
      available: true,
      provider: 'local',
      imageCount: 6,
      faviconCount: 0,
      totalBytes: 416_984,
    }
  }

  const provider =
    getServerEnv().STORAGE_PROVIDER === 's3'
      ? ('s3' as const)
      : ('local' as const)
  try {
    const rows = await db.execute(
      sql`select storage_path from bean_images union all select storage_path from gear_images union all select storage_path from brew_images union all select storage_path from coffee_shop_images union all select storage_path from cafe_visit_images`,
    )
    const allowed = new Set(
      getStoredImagePaths(rows.map((row) => String(row.storage_path))),
    )
    const objects = (await getStorage().listObjects()).filter((object) =>
      allowed.has(object.path),
    )
    const faviconCount = objects.filter((object) =>
      object.path.startsWith(FAVICON_PREFIX),
    ).length
    return {
      available: true,
      provider,
      imageCount: objects.length - faviconCount,
      faviconCount,
      totalBytes: objects.reduce((sum, object) => sum + object.sizeBytes, 0),
    }
  } catch {
    return {
      available: false,
      provider,
      imageCount: null,
      faviconCount: null,
      totalBytes: null,
    }
  }
}

export const getInternalStats = createServerFn({ method: 'GET' }).handler(
  async () => ({ storage: await loadStorageStats() }),
)
