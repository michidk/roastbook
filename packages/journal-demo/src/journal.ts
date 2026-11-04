import {
  ClientJournal,
  type JournalExecutor,
} from '@roastbook/journal-client/journal'
import { journalStateSchema } from '@roastbook/journal-domain/state'

let opening: Promise<ClientJournal> | undefined
export function openEditionJournal(execute: JournalExecutor) {
  opening ??= ClientJournal.open({
    name: 'roastbook-demo-journal',
    execute,
    bootstrap,
  }).catch((error) => {
    opening = undefined
    throw error
  })
  return opening
}

async function bootstrap() {
  const response = await fetch('/demo-local/journal.json')
  if (!response.ok)
    throw new Error(
      'The sample journal could not load. Reload to retry. Your saved demo has not been changed.',
    )
  return journalStateSchema.parse(await response.json())
}
export async function resetEditionJournal() {
  const journal = await opening?.catch(() => undefined)
  if (journal) await journal.reset()
  else
    await ClientJournal.restoreDemo({
      name: 'roastbook-demo-journal',
      bootstrap,
    })
}
