import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  cacheSettingsData,
  loadOfflineSettingsData,
  readCachedSettingsData,
} from '@/modules/offline/settings-cache'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('offline settings cache', () => {
  test('stores and reads drinks and taste tags', async () => {
    await cacheSettingsData('drinks', {
      drinkTypes: [{ id: 1, name: 'Espresso' }],
    })
    await cacheSettingsData('taste-tags', [{ id: 2, name: 'Fruity' }])

    expect(await readCachedSettingsData('drinks')).toEqual({
      drinkTypes: [{ id: 1, name: 'Espresso' }],
    })
    expect(await readCachedSettingsData('taste-tags')).toEqual([
      { id: 2, name: 'Fruity' },
    ])
  })

  test('caches successful loads and falls back to them offline', async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    })

    const loaded = await loadOfflineSettingsData('storage', () =>
      Promise.resolve({ usage: 42 }),
    )
    expect(loaded).toEqual({ usage: 42 })

    const originalOnline = Object.getOwnPropertyDescriptor(navigator, 'onLine')
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    })

    try {
      const cached = await loadOfflineSettingsData<{ usage: number }>(
        'storage',
        () => Promise.reject(new Error('offline')),
      )
      expect(cached).toEqual({ usage: 42 })
    } finally {
      if (originalOnline) {
        Object.defineProperty(navigator, 'onLine', originalOnline)
      } else {
        Reflect.deleteProperty(navigator, 'onLine')
      }
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', originalWindow)
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }
    }
  })
})
