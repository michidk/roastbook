import { createServerOnlyFn } from '@tanstack/react-start'
import type { StorageProvider, StoredObject } from '@/lib/storage/types'
import { demoCapabilityDisabled } from './disabled'

export type { StorageProvider, StoredObject } from '@/lib/storage/types'

const disabledStorage: StorageProvider = {
  upload: async () => demoCapabilityDisabled('Storage uploads'),
  download: async () => demoCapabilityDisabled('Storage downloads'),
  delete: async () => demoCapabilityDisabled('Storage deletion'),
  getUrl: (path) => `/media/${path}`,
  exists: async () => false,
  list: async () => [],
  listObjects: async (): Promise<StoredObject[]> => [],
}

export const getStorage = createServerOnlyFn(() => disabledStorage)

export function generateStoragePath(): never {
  return demoCapabilityDisabled('Storage uploads')
}
