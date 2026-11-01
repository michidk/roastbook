import '@tanstack/react-start/server-only'
import { type JournalIdentity, withJournal } from './journal-context.server'

/** Keep the transaction alive while SSR, AI, or MCP produces its response body. */
export function withJournalResponse(
  identity: JournalIdentity,
  next: () => Promise<Response>,
): Promise<Response> {
  const ready = Promise.withResolvers<Response>()
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined
  let buffered: Response | undefined
  void withJournal(identity, async () => {
    const response = await next()
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
    const reader = response.body.getReader()
    try {
      while (true) {
        const result = await reader.read()
        if (result.done) break
        await writer.write(result.value)
      }
    } catch (error) {
      await reader.cancel(error).catch(() => undefined)
      throw error
    } finally {
      reader.releaseLock()
    }
  })
    .then(async () => {
      // JSON mutation results become visible only after commit; streamed responses
      // signal completion only after the transaction has committed successfully.
      if (buffered) ready.resolve(buffered)
      await writer?.close()
    })
    .catch(async (error: unknown) => {
      ready.reject(error)
      await writer?.abort(error).catch(() => undefined)
    })
  return ready.promise
}
