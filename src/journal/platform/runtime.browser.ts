// Browser platform: journal functions run on the server while it can be
// reached; a browser holding a device copy falls back to it offline. The demo
// has no server journal.
import { encodeInput } from '@/journal/codec'
import type { JournalFunctionInfo } from '@/journal/function'
import { notifyLocalChange } from '@/journal/local/changes'
import {
  hasUnsyncedChanges,
  keepsDeviceCopy,
} from '@/journal/local/device-copy'
import { DEMO_MODE } from '@/lib/build-mode'
import { isConnectionOnline } from '@/lib/connection-status'

export async function runJournalFunction(
  info: JournalFunctionInfo,
  input: unknown,
) {
  if (DEMO_MODE) return runOnDevice(info, input)
  const copy = keepsDeviceCopy()
  // The account lacks changes still waiting in the copy, so the copy answers
  // (and records new ones behind them) until they have synced.
  if (copy && (!isConnectionOnline() || hasUnsyncedChanges()))
    return runOnDevice(info, input)
  if (!isConnectionOnline())
    throw new Error(
      'You are offline. Install Roastbook and open it once while online to keep your journal available offline.',
    )
  try {
    const { callJournal } = await import('@/lib/server/journal-sync')
    const result = await callJournal({
      data: { name: info.name, input: await encodeInput(input) },
    })
    // Pages refresh after a write, as they do for the device copy.
    if (info.kind === 'write') await notifyLocalChange('write')
    return result
  } catch (error) {
    // A read the server could not answer comes from the copy. A write is not
    // repeated: the server may have applied it before the connection failed.
    if (copy && info.kind === 'read' && !isConnectionOnline())
      return runOnDevice(info, input)
    throw error
  }
}

async function runOnDevice(info: JournalFunctionInfo, input: unknown) {
  // Every call queues for its own transaction; journal functions never call
  // each other, so a call while another runs is a concurrent one, not nested.
  // Loaded on first use: the edition imports journal functions itself.
  const { openEditionJournal } = await import('@/journal/local/edition')
  return (await openEditionJournal()).run(info, input)
}
