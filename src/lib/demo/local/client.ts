import { z } from 'zod'

const responseSchema = /* @__PURE__ */ (() =>
  z.discriminatedUnion('kind', [
    z.object({
      id: z.number(),
      kind: z.literal('success'),
      value: z.unknown(),
      changed: z.boolean().optional(),
      media: z
        .array(z.object({ path: z.string(), blob: z.instanceof(Blob) }))
        .optional(),
    }),
    z.object({ id: z.number(), kind: z.literal('error'), message: z.string() }),
  ]))()
const callbacks = new Map<
  number,
  { resolve(value: unknown): void; reject(error: Error): void }
>()
const urls = new Map<string, string>()
let worker: Worker | undefined
let counter = 0
let changes: BroadcastChannel | undefined

export function localDemoImageUrl(path: string) {
  return urls.get(path) ?? ''
}

function getWorker() {
  if (worker) return worker
  if (typeof Worker === 'undefined')
    throw new Error(
      'This browser cannot run the local demo. Use a current browser with worker support. Your saved data has not been changed.',
    )
  worker = new Worker('/demo-local/worker.js', {
    type: 'module',
    name: 'roastbook-browser-demo',
  })
  worker.onmessage = (event: MessageEvent<unknown>) => {
    const response = responseSchema.safeParse(event.data)
    if (!response.success) return
    const result = response.data
    const callback = callbacks.get(result.id)
    if (!callback) return
    callbacks.delete(result.id)
    if (result.kind === 'error') {
      callback.reject(new Error(result.message))
      return
    }
    if (result.media) {
      const live = new Set(result.media.map(({ path }) => path))
      for (const [path, url] of urls)
        if (!live.has(path)) {
          URL.revokeObjectURL(url)
          urls.delete(path)
        }
      for (const { path, blob } of result.media)
        if (!urls.has(path)) urls.set(path, URL.createObjectURL(blob))
    }
    callback.resolve(result.value)
    if (result.changed) changes?.postMessage('changed')
  }
  worker.onerror = () => {
    for (const callback of callbacks.values())
      callback.reject(
        new Error(
          'The browser demo could not start. Reload to retry. Your saved journal has not been changed.',
        ),
      )
    callbacks.clear()
    worker?.terminate()
    worker = undefined
  }
  return worker
}

export function demoFunction(operation: string) {
  return ({ data }: { data?: unknown } = {}): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const id = ++counter
      callbacks.set(id, { resolve, reject })
      try {
        getWorker().postMessage({
          id,
          operation,
          data: data instanceof FormData ? [...data.entries()] : data,
        })
      } catch (error) {
        callbacks.delete(id)
        reject(error)
      }
    })
}

export function subscribeDemoChanges(onChange: () => void) {
  if (typeof BroadcastChannel === 'undefined') return () => undefined
  changes ??= new BroadcastChannel('roastbook-browser-demo-changes')
  changes.addEventListener('message', onChange)
  return () => changes?.removeEventListener('message', onChange)
}

export const resetBrowserDemo = /* @__PURE__ */ demoFunction('demo/reset')
