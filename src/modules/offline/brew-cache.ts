import {
  type CachedEntityDetail,
  cacheEntityDetail,
  readCachedEntityDetail,
  removeCachedEntityDetail,
} from '@/modules/offline/entity-detail-cache'

export type CachedBrewDetail<T> = CachedEntityDetail<T>

export function cacheBrewDetail<T>(
  shotId: number | string,
  data: T,
): Promise<void> {
  return cacheEntityDetail('brew', shotId, data)
}

export function readCachedBrewDetail<T>(
  shotId: number | string,
): Promise<CachedBrewDetail<T> | undefined> {
  return readCachedEntityDetail<T>('brew', shotId)
}

export function removeCachedBrewDetail(shotId: number | string): Promise<void> {
  return removeCachedEntityDetail('brew', shotId)
}
