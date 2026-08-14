import { createServerFn } from '@tanstack/react-start'
import { getServerEnv } from '@/lib/env.server'
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
  const provider =
    getServerEnv().STORAGE_PROVIDER === 's3'
      ? ('s3' as const)
      : ('local' as const)
  try {
    const objects = await getStorage().listObjects()
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
