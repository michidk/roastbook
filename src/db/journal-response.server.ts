import '@tanstack/react-start/server-only'
import { JournalBusyError } from './journal-admission.server'
import { type JournalIdentity, withJournal } from './journal-context.server'

/** Keep streamed database work scoped, with bounded request and reader lifetimes. */
export function withJournalResponse(
  identity: JournalIdentity,
  next: () => Promise<Response>,
  options: { signal?: AbortSignal } = {},
): Promise<Response> {
  const ready = Promise.withResolvers<Response>()
  const cancellation = new AbortController()
  const signal = options.signal
    ? AbortSignal.any([options.signal, cancellation.signal])
    : cancellation.signal
  const deadline = setTimeout(
    () => cancellation.abort(new Error('Journal request timed out')),
    180_000,
  )
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let buffered: Response | undefined
  const abort = () => {
    void reader?.cancel(signal.reason).catch(() => undefined)
    void writer?.abort(signal.reason).catch(() => undefined)
  }
  signal.addEventListener('abort', abort, { once: true })
  void withJournal(
    identity,
    async () => {
      const response = await next()
      if (signal.aborted) {
        void response.body?.cancel(signal.reason).catch(() => undefined)
        signal.throwIfAborted()
      }
      const type = response.headers.get('content-type') ?? ''
      if (!response.body || type.includes('application/json')) {
        buffered = new Response(
          response.body ? await response.arrayBuffer() : null,
          response,
        )
        return
      }
      const channel = new TransformStream<Uint8Array, Uint8Array>()
      writer = channel.writable.getWriter()
      ready.resolve(new Response(channel.readable, response))
      reader = response.body.getReader()
      try {
        while (true) {
          const result = await reader.read()
          if (result.done) break
          const stalled = setTimeout(
            () =>
              cancellation.abort(
                new Error('Journal response reader timed out'),
              ),
            15_000,
          )
          try {
            await writer.write(result.value)
          } finally {
            clearTimeout(stalled)
          }
        }
        signal.throwIfAborted()
      } catch (error) {
        void reader.cancel(error).catch(() => undefined)
        throw error
      } finally {
        reader.releaseLock()
      }
    },
    { signal },
  )
    .then(async () => {
      // Expose JSON results and finish streams only after the database commits.
      if (buffered) ready.resolve(buffered)
      await writer?.close()
    })
    .catch(async (error: unknown) => {
      if (error instanceof JournalBusyError || signal.aborted) {
        ready.resolve(
          Response.json(
            {
              error:
                error instanceof JournalBusyError
                  ? 'journal_busy'
                  : 'request_timeout',
            },
            {
              status: error instanceof JournalBusyError ? 429 : 408,
              headers: {
                'Cache-Control': 'private, no-store',
                'Retry-After': '1',
              },
            },
          ),
        )
      } else ready.reject(error)
      await writer?.abort(error).catch(() => undefined)
    })
    .finally(() => {
      clearTimeout(deadline)
      signal.removeEventListener('abort', abort)
    })
  return ready.promise
}
