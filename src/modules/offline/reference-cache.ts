import { getLocalEntity, putLocalEntity, removeLocalEntity } from './local-data'
import type { CachedReferenceData } from './types'

export async function writeCachedReferenceData<T>(
  key: string,
  version: number,
  data: T,
): Promise<void> {
  const record: CachedReferenceData<T> = {
    version,
    savedAt: new Date().toISOString(),
    data,
  }
  await putLocalEntity({
    entityType: 'settings',
    localId: `reference:${key}`,
    data: { record },
    syncState: 'synced',
    updatedAt: record.savedAt,
  })
}

export async function readCachedReferenceData<T>(
  key: string,
  version: number,
): Promise<CachedReferenceData<T> | undefined> {
  const entity = await getLocalEntity<{ record: CachedReferenceData<T> }>(
    'settings',
    `reference:${key}`,
  )
  const record = entity?.data.record

  if (!record || record.version !== version) {
    if (record) {
      await removeLocalEntity('settings', `reference:${key}`)
    }
    return undefined
  }

  return record
}
