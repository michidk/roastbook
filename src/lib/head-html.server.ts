const HEAD_END_TAG = '</head>'
const HEAD_END_TAG_OVERLAP = HEAD_END_TAG.length - 1

/**
 * Injects trusted, build-time HTML into streamed document responses without
 * buffering the application render. Non-HTML responses are returned unchanged.
 */
export function injectHeadHtml(
  response: Response,
  headHtml?: string,
): Response {
  if (!headHtml || !isInjectableHtmlResponse(response)) return response

  const headers = new Headers(response.headers)
  headers.delete('content-length')

  return new Response(
    response.body.pipeThrough(createHeadInjectionStream(headHtml)),
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  )
}

function isInjectableHtmlResponse(response: Response): response is Response & {
  body: ReadableStream<Uint8Array>
} {
  return (
    response.body !== null &&
    response.headers
      .get('content-type')
      ?.toLowerCase()
      .includes('text/html') === true &&
    !response.headers.has('content-encoding')
  )
}

function createHeadInjectionStream(
  headHtml: string,
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let pending = ''
  let injected = false

  const emitPending = (
    controller: TransformStreamDefaultController<Uint8Array>,
  ) => {
    if (!pending) return
    controller.enqueue(encoder.encode(pending))
    pending = ''
  }

  const injectWhenReady = (
    controller: TransformStreamDefaultController<Uint8Array>,
    flush = false,
  ) => {
    if (injected) {
      emitPending(controller)
      return
    }

    const headEndIndex = pending.toLowerCase().indexOf(HEAD_END_TAG)
    if (headEndIndex >= 0) {
      pending = `${pending.slice(0, headEndIndex)}${headHtml}${pending.slice(headEndIndex)}`
      injected = true
      emitPending(controller)
      return
    }

    if (flush) {
      emitPending(controller)
      return
    }

    const safeLength = Math.max(0, pending.length - HEAD_END_TAG_OVERLAP)
    if (safeLength === 0) return

    controller.enqueue(encoder.encode(pending.slice(0, safeLength)))
    pending = pending.slice(safeLength)
  }

  return new TransformStream({
    transform(chunk, controller) {
      pending += decoder.decode(chunk, { stream: true })
      injectWhenReady(controller)
    },
    flush(controller) {
      pending += decoder.decode()
      injectWhenReady(controller, true)
    },
  })
}
