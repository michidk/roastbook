import {
  getLocalEntityByServerId,
  putLocalEntity,
  removeLocalEntity,
} from '@/modules/offline/local-data'
import type { OfflineEntityType } from '@/modules/offline/operations'

export interface CachedEntityDetail<T> {
  readonly savedAt: string
  readonly data: T
}

export async function cacheEntityDetail<T>(
  entityType: OfflineEntityType,
  serverId: number | string,
  data: T,
): Promise<void> {
  const serverIdValue = String(serverId)
  const existing = await getLocalEntityByServerId<T>(entityType, serverIdValue)
  if (existing?.syncState === 'pending' || existing?.syncState === 'conflict') {
    return
  }
  const updatedAt = new Date().toISOString()

  if (existing) {
    await putLocalEntity({
      ...existing,
      data,
      syncState: 'synced',
      updatedAt,
    })
    return
  }

  await putLocalEntity({
    entityType,
    localId: serverIdValue,
    serverId: serverIdValue,
    data,
    syncState: 'synced',
    updatedAt,
  })
}

export async function readCachedEntityDetail<T>(
  entityType: OfflineEntityType,
  serverId: number | string,
): Promise<CachedEntityDetail<T> | undefined> {
  const record = await getLocalEntityByServerId<T>(entityType, String(serverId))
  if (!record || record.deletedAt) return undefined
  return { savedAt: record.updatedAt, data: record.data }
}

export async function removeCachedEntityDetail(
  entityType: OfflineEntityType,
  serverId: number | string,
): Promise<void> {
  const serverIdValue = String(serverId)
  const existing = await getLocalEntityByServerId(entityType, serverIdValue)
  await removeLocalEntity(entityType, existing?.localId ?? serverIdValue)
}
