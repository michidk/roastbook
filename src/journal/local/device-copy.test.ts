import { afterEach, beforeEach, expect, test } from 'bun:test'
import { keepsDeviceCopy } from './device-copy'

const originals = new Map(
  ['window', 'localStorage'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
)
const originalStandalone = Object.getOwnPropertyDescriptor(
  navigator,
  'standalone',
)
let standalone = false
let stored: Map<string, string>

beforeEach(() => {
  standalone = false
  stored = new Map()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia: () => ({ matches: standalone }) },
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  })
  Object.defineProperty(navigator, 'standalone', {
    configurable: true,
    value: false,
  })
})

afterEach(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
  if (originalStandalone)
    Object.defineProperty(navigator, 'standalone', originalStandalone)
  else Reflect.deleteProperty(navigator, 'standalone')
})

test('a fresh browser tab uses the server without creating a copy', () => {
  expect(keepsDeviceCopy()).toBe(false)
  expect(stored.size).toBe(0)
})

test('opening the installed app enables a copy that browser tabs retain', () => {
  standalone = true
  expect(keepsDeviceCopy()).toBe(true)
  standalone = false
  expect(keepsDeviceCopy()).toBe(true)
})

test('the iOS installed app also enables a copy', () => {
  Object.defineProperty(navigator, 'standalone', { value: true })
  expect(keepsDeviceCopy()).toBe(true)
  Object.defineProperty(navigator, 'standalone', { value: false })
  expect(keepsDeviceCopy()).toBe(true)
})

test('browser tabs preserve copies enabled with the former setting', () => {
  stored.set('roastbook-device-copy', 'on')
  expect(keepsDeviceCopy()).toBe(true)
  expect(stored.get('roastbook-device-copy')).toBe('on')
})

test('server rendering does not access browser storage', () => {
  Reflect.deleteProperty(globalThis, 'window')
  expect(keepsDeviceCopy()).toBe(false)
})
