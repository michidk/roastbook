// Browser platform: limits come from the server (kept for offline use) or the demo.
import type { JournalConfig } from '@/journal/platform/config'

export type { JournalConfig }

let current: JournalConfig = {
  imageStorageLimitMib: 50,
  imageMaxPerItem: 3,
  storageProvider: 'browser',
}

export function setJournalConfig(
  config: Omit<JournalConfig, 'storageProvider'>,
) {
  current = { ...config, storageProvider: 'browser' }
}

export function journalConfig(): JournalConfig {
  return current
}
