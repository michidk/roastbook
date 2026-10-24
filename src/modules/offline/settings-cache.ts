import { getLocalEntity, putLocalEntity } from '@/modules/offline/local-data'
import type { OfflineEntityType } from '@/modules/offline/operations'

export type SettingsCacheKey =
  | 'drinks'
  | 'taste-tags'
  | 'ai'
  | 'shottimer'
  | 'storage'

const CACHE_ENTITY_TYPES: Record<SettingsCacheKey, OfflineEntityType> = {
  drinks: 'drink',
  'taste-tags': 'tag',
  ai: 'settings',
  shottimer: 'settings',
  storage: 'settings',
}

function cacheLocalId(key: SettingsCacheKey): string {
  return `settings:${key}`
}

export async function cacheSettingsData<T>(
  key: SettingsCacheKey,
  data: T,
): Promise<void> {
  await putLocalEntity({
    entityType: CACHE_ENTITY_TYPES[key],
    localId: cacheLocalId(key),
    data,
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  })
}

export async function readCachedSettingsData<T>(
  key: SettingsCacheKey,
): Promise<T | undefined> {
  const record = await getLocalEntity<T>(
    CACHE_ENTITY_TYPES[key],
    cacheLocalId(key),
  )
  if (!record || record.deletedAt) return undefined
  return record.data
}

/**
 * Runs a settings loader and caches successful data. If the loader fails while
 * offline, the last successful response is returned instead. The Settings
 * shell already marks the page read-only while offline.
 */
export async function loadOfflineSettingsData<T>(
  key: SettingsCacheKey,
  load: () => Promise<T>,
): Promise<T> {
  try {
    const data = await load()
    if (typeof window !== 'undefined') {
      await cacheSettingsData(key, data).catch(() => undefined)
    }
    return data
  } catch (error) {
    if (typeof window === 'undefined' || navigator.onLine) throw error

    try {
      const cached = await readCachedSettingsData<T>(key)
      if (cached !== undefined) return cached
    } catch {
      // Fall through to the original loader error when the cache is missing.
    }

    throw error
  }
}
