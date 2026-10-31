import { afterEach, beforeEach, expect, test } from 'bun:test'
import {
  fetchWithConnectionStatus,
  isConnectionOnline,
} from '@/lib/connection-status'

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalOnline = Object.getOwnPropertyDescriptor(navigator, 'onLine')
let events: EventTarget

beforeEach(() => {
  events = new EventTarget()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: events,
  })
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  })
})

afterEach(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
  if (originalOnline) Object.defineProperty(navigator, 'onLine', originalOnline)
  else Reflect.deleteProperty(navigator, 'onLine')
})

test('a real network failure changes status even when navigator reports online, and a response restores it', async () => {
  const server = Bun.serve({ port: 0, fetch: () => new Response('reachable') })
  const url = server.url
  await server.stop(true)
  await expect(fetchWithConnectionStatus(url)).rejects.toThrow(
    'Failed to fetch',
  )
  expect(isConnectionOnline()).toBe(false)

  const restored = Bun.serve({
    port: 0,
    fetch: () => new Response('reachable'),
  })
  try {
    expect(await (await fetchWithConnectionStatus(restored.url)).text()).toBe(
      'reachable',
    )
    expect(isConnectionOnline()).toBe(true)
  } finally {
    await restored.stop(true)
  }
})

test('airplane mode interrupts an in-flight read so the loader can use its saved copy', async () => {
  let finishRequest: ((response: Response) => void) | undefined
  let requestArrived: (() => void) | undefined
  const arrived = new Promise<void>((resolve) => {
    requestArrived = resolve
  })
  const server = Bun.serve({
    port: 0,
    idleTimeout: 1,
    fetch: () => {
      requestArrived?.()
      return new Promise<Response>((resolve) => {
        finishRequest = resolve
      })
    },
  })
  try {
    const request = fetchWithConnectionStatus(server.url)
    const rejected = expect(request).rejects.toThrow('Failed to fetch')
    await arrived
    events.dispatchEvent(new Event('offline'))
    await rejected
    expect(isConnectionOnline()).toBe(false)
  } finally {
    finishRequest?.(new Response('done'))
    await server.stop(true)
  }
})

test('caller cancellation does not mark the connection offline', async () => {
  const server = Bun.serve({ port: 0, fetch: () => new Response('reachable') })
  try {
    await fetchWithConnectionStatus(server.url)
    await expect(
      fetchWithConnectionStatus(server.url, {
        signal: AbortSignal.abort(),
      }),
    ).rejects.toThrow()
    expect(isConnectionOnline()).toBe(true)
  } finally {
    await server.stop(true)
  }
})

test('an HTTP error is not a lost connection', async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => new Response('Forbidden', { status: 403 }),
  })
  try {
    expect((await fetchWithConnectionStatus(server.url)).status).toBe(403)
    expect(isConnectionOnline()).toBe(true)
  } finally {
    await server.stop(true)
  }
})
