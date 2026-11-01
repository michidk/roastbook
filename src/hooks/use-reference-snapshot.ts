import { useEffect } from 'react'
import { DEMO_MODE } from '@/lib/build-mode'
import { writeCachedReferenceData } from '@/modules/offline/reference-cache'

export function useReferenceSnapshot<T>(
  key: string,
  data: T,
  savedAt?: string,
) {
  useEffect(() => {
    if (DEMO_MODE || savedAt) return
    void writeCachedReferenceData(key, 1, data).catch(() => undefined)
  }, [key, data, savedAt])
}
