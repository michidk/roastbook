import { createServerFn } from '@tanstack/react-start'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import {
  imageStoragePolicy,
  loadImageStorageUsage,
  measureLegacyImageStorage,
} from '@/lib/server/image-storage.server'

async function loadStorageStats() {
  if (DEMO_MODE)
    return {
      available: true,
      provider: 'local' as const,
      imageCount: 6,
      totalBytes: 416_984,
      unmeasuredImages: 0,
      maxImagesPerItem: 3,
      limitBytes: null,
    }
  const policy = imageStoragePolicy()
  const provider = getServerEnv().STORAGE_PROVIDER
  try {
    await measureLegacyImageStorage()
    return {
      available: true,
      provider,
      ...(await loadImageStorageUsage()),
      ...policy,
    }
  } catch {
    return {
      available: false,
      provider,
      imageCount: null,
      totalBytes: null,
      unmeasuredImages: null,
      ...policy,
    }
  }
}

export const getInternalStats = createServerFn({ method: 'GET' }).handler(
  async () => ({ storage: await loadStorageStats() }),
)
