import { requireFeature } from '@/lib/app-capabilities'
import { DEMO_MODE } from '@/lib/build-mode'
import { isConnectionOnline } from '@/lib/connection-status'
import { isNetworkError } from './errors'

export type JournalMutationResult<T> =
  | { readonly kind: 'saved'; readonly value: T }
  | { readonly kind: 'queued'; readonly operationId: string }

/** Only transport failure can switch to the queue. UI callbacks run after this completes. */
export async function runJournalMutation<T>({
  send,
  enqueue,
  online = isConnectionOnline,
}: {
  readonly send: () => Promise<T>
  readonly enqueue: () => Promise<string>
  readonly online?: () => boolean
}): Promise<JournalMutationResult<T>> {
  requireFeature('journal-write')
  if (DEMO_MODE) return { kind: 'saved', value: await send() }
  if (!online()) return { kind: 'queued', operationId: await enqueue() }
  try {
    return { kind: 'saved', value: await send() }
  } catch (error) {
    if (!isNetworkError(error)) throw error
    return { kind: 'queued', operationId: await enqueue() }
  }
}
