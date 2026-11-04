import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { loadCached } from './cached-read'
import {
  cacheEntityDetail,
  readCachedEntityDetail,
} from './entity-detail-cache'
import { resetOfflineDatabaseForTests } from './storage'

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalOnline = Object.getOwnPropertyDescriptor(navigator, 'onLine')
beforeEach(async () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  })
  await resetOfflineDatabaseForTests()
})
afterAll(async () => {
  await resetOfflineDatabaseForTests()
  if (originalWindow)
    Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
  if (originalOnline) Object.defineProperty(navigator, 'onLine', originalOnline)
  else Reflect.deleteProperty(navigator, 'onLine')
})

const failNetwork = async (): Promise<{ name: string; page: number }> => {
  throw new TypeError('Failed to fetch Roastbook')
}

describe('legacy cached reads', () => {
  test('persists successful route data and recovers it when the server cannot be reached', async () => {
    const data = { name: 'Morning', page: 1 }
    expect(
      await loadCached({
        read: () =>
          readCachedEntityDetail<{ name: string; page: number }>('recipe', 4),
        write: (data) => cacheEntityDetail('recipe', 4, data),
        load: async () => data,
      }),
    ).toEqual(data)
    expect(
      await loadCached({
        read: () =>
          readCachedEntityDetail<{ name: string; page: number }>('recipe', 4),
        write: (data) => cacheEntityDetail('recipe', 4, data),
        load: failNetwork,
      }),
    ).toMatchObject({ ...data, offlineSnapshotSavedAt: expect.any(String) })
  })

  test('does not substitute a saved page for different search parameters or a domain error', async () => {
    await cacheEntityDetail('bean', 4, { name: 'Konga', page: 1 })
    await expect(
      loadCached({
        read: () =>
          readCachedEntityDetail<{ name: string; page: number }>('bean', 4),
        load: failNetwork,
        accepts: (data) => data.page === 2,
      }),
    ).rejects.toThrow('Failed to fetch')
    await expect(
      loadCached({
        read: () =>
          readCachedEntityDetail<{ name: string; page: number }>('bean', 4),
        load: async () => {
          throw new Error('Permission denied')
        },
      }),
    ).rejects.toThrow('Permission denied')
    expect(await readCachedEntityDetail('bean', 4)).toBeDefined()
  })

  test('storage failures preserve successful server responses and the original network error', async () => {
    expect(
      await loadCached({
        load: async () => ({ name: 'Morning' }),
        write: async () => {
          throw new Error('Quota exceeded')
        },
        read: async () => undefined,
      }),
    ).toEqual({ name: 'Morning' })
    await expect(
      loadCached({
        load: failNetwork,
        read: async () => {
          throw new Error('Corrupt cache')
        },
      }),
    ).rejects.toThrow('Failed to fetch')
  })
})
