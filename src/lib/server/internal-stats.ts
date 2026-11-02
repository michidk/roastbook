import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { owned } from '@/db/journal-scope.server'
import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  shotImages,
} from '@/db/schema'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { getStoredImagePaths } from '@/lib/image-path'
import { getStorage } from '@/lib/storage'

const FAVICON_PREFIX = 'favicons/'

type StorageStats = {
  readonly available: boolean
  readonly provider: 'local' | 's3' | 'r2'
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

  const provider = getServerEnv().STORAGE_PROVIDER
  try {
    const groups = await Promise.all([
      db
        .select({ storagePath: beanImages.storagePath })
        .from(beanImages)
        .where(owned(beanImages)),
      db
        .select({ storagePath: gearImages.storagePath })
        .from(gearImages)
        .where(owned(gearImages)),
      db
        .select({ storagePath: shotImages.storagePath })
        .from(shotImages)
        .where(owned(shotImages)),
      db
        .select({ storagePath: coffeeShopImages.storagePath })
        .from(coffeeShopImages)
        .where(owned(coffeeShopImages)),
      db
        .select({ storagePath: cafeVisitImages.storagePath })
        .from(cafeVisitImages)
        .where(owned(cafeVisitImages)),
    ])
    const rows = groups.flat()
    const allowed = new Set(
      getStoredImagePaths(rows.map((row) => row.storagePath)),
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
