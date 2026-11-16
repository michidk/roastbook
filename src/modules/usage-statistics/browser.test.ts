import { afterEach, expect, test } from 'bun:test'
import {
  browserUsageEvent,
  reportBrowserUsage,
  subscribeBrowserUsage,
} from './browser'
import { browserUsageEventSchema } from './contract'

const descriptors = {
  window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
  navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
}
afterEach(() => {
  for (const key of ['window', 'navigator'] as const) {
    const descriptor = descriptors[key]
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

test('only forwards validated online browser events while subscribed, without backfill', () => {
  const target = new EventTarget()
  const connection = { onLine: true }
  Object.defineProperty(globalThis, 'window', {
    value: target,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'navigator', {
    value: connection,
    configurable: true,
  })
  const events: string[] = []
  reportBrowserUsage('pwa_installed')
  const stop = subscribeBrowserUsage((event) => events.push(event))
  for (const event of browserUsageEventSchema.options) reportBrowserUsage(event)
  target.dispatchEvent(
    new CustomEvent(browserUsageEvent, {
      detail: { event: 'pwa_installed', private: 'secret' },
    }),
  )
  target.dispatchEvent(
    new CustomEvent(browserUsageEvent, { detail: 'bean_created' }),
  )
  target.dispatchEvent(new Event(browserUsageEvent))
  connection.onLine = false
  reportBrowserUsage('pwa_installed')
  connection.onLine = true
  expect(events).toEqual(browserUsageEventSchema.options)
  stop()
  reportBrowserUsage('pwa_installed')
  expect(events).toEqual(browserUsageEventSchema.options)
})
