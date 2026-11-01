import { DEMO_MODE } from '@/lib/build-mode'
import { loadCached } from '@/modules/offline/cached-read'
import {
  cacheEntityDetail,
  readCachedEntityDetail,
} from '@/modules/offline/entity-detail-cache'
import type { OfflineEntityType } from '@/modules/offline/operations'
import {
  readCachedReferenceData,
  writeCachedReferenceData,
} from '@/modules/offline/reference-cache'

export function loadEntityDetail<T extends object>({
  entityType,
  id,
  load,
  accepts,
  restore,
}: {
  readonly entityType: OfflineEntityType
  readonly id: number
  readonly load: () => Promise<T>
  readonly accepts?: (data: T) => boolean
  readonly restore?: (data: T) => Promise<T>
}) {
  return loadCached({
    load,
    accepts,
    read: async () => {
      const cached = await readCachedEntityDetail<T>(entityType, id)
      return cached && restore
        ? { ...cached, data: await restore(cached.data) }
        : cached
    },
    write: (data) => cacheEntityDetail(entityType, id, data),
  })
}

export function loadReferenceData<T extends object>({
  key,
  load,
  fallback,
}: {
  readonly key: string
  readonly load: () => Promise<T>
  readonly fallback?: () => Promise<
    { readonly data: T; readonly savedAt: string } | undefined
  >
}) {
  return loadCached({
    load,
    read: async () =>
      (await readCachedReferenceData<T>(key, 1)) ?? (await fallback?.()),
    write: (data) => writeCachedReferenceData(key, 1, data),
  })
}

export async function saveEntitySnapshot<T>(
  entityType: OfflineEntityType,
  id: number,
  data: T,
): Promise<void> {
  if (DEMO_MODE || typeof window === 'undefined') return
  await cacheEntityDetail(entityType, id, data)
}
