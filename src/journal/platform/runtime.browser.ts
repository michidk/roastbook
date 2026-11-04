// Browser platform: journal functions run on this device's journal when the
// browser keeps one, otherwise on the server.
import { encodeInput } from '@/journal/codec'
import type { JournalFunctionInfo } from '@/journal/function'
import { notifyLocalChange } from '@/journal/local/changes'
import { keepsDeviceCopy } from '@/journal/local/device-copy'
import { isConnectionOnline } from '@/lib/connection-status'

export async function runJournalFunction(
  info: JournalFunctionInfo,
  input: unknown,
) {
  if (!keepsDeviceCopy()) {
    if (!isConnectionOnline())
      throw new Error(
        'You are offline. To use Roastbook offline, install it or turn on Settings → Offline → Keep this journal on this device.',
      )
    const { callJournal } = await import('@/lib/server/journal-sync')
    const result = await callJournal({
      data: { name: info.name, input: await encodeInput(input) },
    })
    // Pages refresh after a write, as they do for the device copy.
    if (info.kind === 'write') await notifyLocalChange('write')
    return result
  }
  // Every call queues for its own transaction; journal functions never call
  // each other, so a call while another runs is a concurrent one, not nested.
  // Loaded on first use: the edition imports journal functions itself.
  const { openEditionJournal } = await import('@/journal/local/edition')
  return (await openEditionJournal()).run(info, input)
}
