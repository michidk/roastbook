// Browser platform: journal functions run against this browser's journal.
import type { JournalFunctionInfo } from '@/journal/function'

export async function runJournalFunction(
  info: JournalFunctionInfo,
  input: unknown,
) {
  // Every call queues for its own transaction; journal functions never call
  // each other, so a call while another runs is a concurrent one, not nested.
  // Loaded on first use: the edition imports journal functions itself.
  const { openEditionJournal } = await import('@/journal/local/edition')
  return (await openEditionJournal()).run(info, input)
}
