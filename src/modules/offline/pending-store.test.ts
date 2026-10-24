import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { newShotPayload } from '@/lib/new-shot-payload'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'
import { getLocalEntity } from '@/modules/offline/local-data'
import {
  discardPendingBrew,
  enqueuePendingBrew,
  usePendingBrewsStore,
} from '@/modules/offline/pending-store'
import {
  getPendingBrew,
  putPendingBrew,
  resetOfflineDatabaseForTests,
} from '@/modules/offline/queue'
import { subscribeToPendingSync } from '@/modules/offline/sync-trigger'
import type { PendingBrew } from '@/modules/offline/types'

function pendingBrew(): PendingBrew {
  const operationId = crypto.randomUUID()
  return {
    operationId,
    payload: {
      ...newShotPayload(
        {
          ...EMPTY_SHOT_FORM_VALUES,
          brewingMethodId: '1',
          doseGrams: '18.00',
        },
        [],
      ),
      clientOperationId: operationId,
    },
    summary: {
      beanName: 'Konga',
      methodName: 'Espresso',
      brewedAt: '2026-10-23T08:00:00.000Z',
      doseGrams: '18.00',
      yieldGrams: null,
      shotTimeSeconds: null,
    },
    createdAt: '2026-10-23T08:00:01.000Z',
    attempts: 0,
    status: 'pending',
  }
}

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
  usePendingBrewsStore.setState({
    items: [],
    isHydrated: false,
    isSyncing: false,
    loadError: null,
  })
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('pending brew store', () => {
  test('blocks discarding while a sync is running', async () => {
    const item = pendingBrew()
    await putPendingBrew(item)
    await usePendingBrewsStore.getState().hydrate()

    usePendingBrewsStore.setState({ isSyncing: true })
    await expect(discardPendingBrew(item.operationId)).rejects.toThrow(
      'Wait for the current sync to finish',
    )
    expect(await getPendingBrew(item.operationId)).toBeDefined()

    usePendingBrewsStore.setState({ isSyncing: false })
    await discardPendingBrew(item.operationId)
    expect(await getPendingBrew(item.operationId)).toBeUndefined()
  })

  test('requests a sync after enqueueing a brew', async () => {
    let syncRequests = 0
    const unsubscribe = subscribeToPendingSync(() => {
      syncRequests += 1
    })

    try {
      await enqueuePendingBrew(pendingBrew())
    } finally {
      unsubscribe()
    }

    expect(syncRequests).toBe(1)
    expect(usePendingBrewsStore.getState().items).toHaveLength(1)
  })

  test('creates a local entity for a queued brew', async () => {
    const item = pendingBrew()
    await enqueuePendingBrew(item)

    expect(await getLocalEntity('brew', item.operationId)).toMatchObject({
      localId: item.operationId,
      data: item.payload,
      syncState: 'pending',
      serverId: null,
    })
  })

  test('records a failed read and clears it after a successful refresh', async () => {
    const originalIndexedDb = globalThis.indexedDB
    await resetOfflineDatabaseForTests()
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
    })

    try {
      await usePendingBrewsStore.getState().hydrate()
      expect(usePendingBrewsStore.getState().isHydrated).toBe(true)
      expect(usePendingBrewsStore.getState().loadError).not.toBeNull()
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', {
        configurable: true,
        value: originalIndexedDb,
      })
    }

    await usePendingBrewsStore.getState().refresh()
    expect(usePendingBrewsStore.getState().loadError).toBeNull()
    expect(usePendingBrewsStore.getState().items).toEqual([])
  })
})
