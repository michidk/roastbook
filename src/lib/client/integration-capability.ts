import { isConnectionOnline } from '@/lib/connection-status'

/** Optional services must never prevent opening the local journal. */
export function integrationCapability(
  probe: () => Promise<{ enabled: boolean }>,
) {
  return async () => {
    if (!isConnectionOnline()) return { enabled: false }
    return probe().catch(() => ({ enabled: false }))
  }
}
