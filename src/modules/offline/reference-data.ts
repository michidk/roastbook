import {
  readCachedReferenceData,
  writeCachedReferenceData,
} from '@/modules/offline/reference-cache'
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

export function writeCachedNewBrewReferenceData<T>(data: T): Promise<void> {
  return writeCachedReferenceData(
    NEW_BREW_REFERENCE_DATA_KEY,
    NEW_BREW_REFERENCE_DATA_VERSION,
    data,
  )
}
