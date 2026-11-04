import { requestPendingSync } from '@/modules/offline/sync-trigger'

const heldForTasting = new Set<string>()

export function releasePendingBrewForTasting(operationId: string): void {
  heldForTasting.delete(operationId)
  requestPendingSync()
}

export function isPendingBrewHeldForTasting(operationId: string): boolean {
  return heldForTasting.has(operationId)
}
