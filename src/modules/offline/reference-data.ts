import { readCachedReferenceData } from '@/modules/offline/reference-cache'
import type { CachedReferenceData } from '@/modules/offline/types'

export const NEW_BREW_REFERENCE_DATA_KEY = 'new-brew'
export const NEW_BREW_REFERENCE_DATA_VERSION = 1

export function readCachedNewBrewReferenceData<T>(): Promise<
  CachedReferenceData<T> | undefined
> {
  return readCachedReferenceData<T>(
    NEW_BREW_REFERENCE_DATA_KEY,
    NEW_BREW_REFERENCE_DATA_VERSION,
  )
}
