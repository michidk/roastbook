import { DEMO_MODE } from '@/lib/build-mode'
import { readWithCache } from '@/modules/offline/cached-read'
import { getLocalEntity, putLocalEntity } from '@/modules/offline/local-data'
import type { OfflineEntityType } from '@/modules/offline/operations'

export type SettingsCacheKey =
  | 'general'
  | 'drinks'
  | 'taste-tags'
  | 'ai'
  | 'ai-provider'
  | 'shottimer'
  | 'storage'

const CACHE_ENTITY_TYPES: Record<SettingsCacheKey, OfflineEntityType> = {
  general: 'settings',
  drinks: 'drink',
  'taste-tags': 'tag',
  ai: 'settings',
  'ai-provider': 'settings',
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
  if (DEMO_MODE) return
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
  if (DEMO_MODE) return undefined
  const record = await getLocalEntity<T>(
    CACHE_ENTITY_TYPES[key],
    cacheLocalId(key),
  )
  if (!record) return undefined
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
  const result = await readWithCache({
    load,
    write: (data) => cacheSettingsData(key, data),
    read: async () => {
      const cached = await readCachedSettingsData<T>(key)
      return cached === undefined
        ? undefined
        : { data: cached, savedAt: new Date().toISOString() }
    },
  })
  return result.value
}
