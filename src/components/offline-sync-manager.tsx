import { useJournalSync } from '@/lib/client/journal-sync'

export function OfflineSyncManager() {
  useJournalSync()
  return null
}
