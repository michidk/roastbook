// Server platform: the request already established the journal scope.
// The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import type { JournalFunctionInfo } from '@/journal/function'

export function runJournalFunction(info: JournalFunctionInfo, input: unknown) {
  return info.execute(input)
}
