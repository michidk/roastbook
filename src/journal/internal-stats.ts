import {
  imageStoragePolicy,
  loadImageStorageUsage,
  measureLegacyImageStorage,
} from '@/journal/domain/image-storage'
import { journalRead } from '@/journal/function'
import { journalConfig } from '@/journal/platform/config'

async function loadStorageStats() {
  const policy = imageStoragePolicy()
  const provider = journalConfig().storageProvider
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

export const getInternalStats = journalRead(
  'internal-stats/getInternalStats',
).handler(async () => ({ storage: await loadStorageStats() }))
