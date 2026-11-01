import { useEffect } from 'react'
import { saveEntitySnapshot } from '@/lib/client/cached-reads'
import type { OfflineEntityType } from '@/modules/offline/operations'

export function useEntitySnapshot<T>(
  entityType: OfflineEntityType,
  id: number | undefined,
  data: T,
  savedAt?: string,
) {
  useEffect(() => {
    if (id === undefined || savedAt) return
    void saveEntitySnapshot(entityType, id, data).catch(() => undefined)
  }, [entityType, id, data, savedAt])
}
