import '@tanstack/react-start/server-only'

/** Read once with a bound even when Content-Length is absent or incorrect. */
export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
) {
  const length = request.headers.get('content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes))
    return new Response('Request is too large', { status: 413 })
  const reader = request.body?.getReader()
  if (!reader) return new Response('Request body is required', { status: 400 })
  const chunks: Uint8Array[] = []
  let size = 0
  let complete = false
  let deadline: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    deadline = setTimeout(() => reject(new Error('Body timeout')), 10_000)
  })
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), timeout])
      if (chunk.done) {
        complete = true
        return Buffer.concat(chunks, size)
      }
      size += chunk.value.byteLength
      if (size > maxBytes)
        return new Response('Request is too large', { status: 413 })
      chunks.push(chunk.value)
    }
  } catch {
    return new Response('Could not read request', { status: 400 })
  } finally {
    clearTimeout(deadline)
    if (!complete) void reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
