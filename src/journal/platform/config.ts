// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import { getServerEnv } from '@/lib/env.server'

export type JournalConfig = {
  /** 0 means unlimited. */
  readonly imageStorageLimitMib: number
  readonly imageMaxPerItem: number
  readonly storageProvider: 'local' | 's3' | 'r2' | 'browser'
}

export function journalConfig(): JournalConfig {
  const env = getServerEnv()
  return {
    imageStorageLimitMib:
      env.IMAGE_STORAGE_LIMIT_MIB ??
      (env.DEPLOYMENT_MODE === 'hosted' ? 250 : 0),
    imageMaxPerItem: env.IMAGE_MAX_PER_ITEM,
    storageProvider: env.STORAGE_PROVIDER,
  }
}
