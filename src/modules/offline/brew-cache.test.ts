import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  cacheBrewDetail,
  readCachedBrewDetail,
  removeCachedBrewDetail,
} from '@/modules/offline/brew-cache'
import {
  getLocalEntity,
  getLocalEntityByServerId,
  putLocalEntity,
} from '@/modules/offline/local-data'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('cached brew detail', () => {
  test('stores and reads a brew detail snapshot by server ID', async () => {
    await cacheBrewDetail(42, {
      shot: { id: 42, doseGrams: '18.00' },
      recipes: [{ id: 3, name: 'Morning' }],
    })

    expect(await readCachedBrewDetail(42)).toMatchObject({
      data: {
        shot: { id: 42, doseGrams: '18.00' },
        recipes: [{ id: 3, name: 'Morning' }],
      },
    })
    expect(await getLocalEntityByServerId('brew', '42')).toMatchObject({
      localId: '42',
      serverId: '42',
      syncState: 'synced',
    })
  })

  test('updates the local entity created for a queued brew', async () => {
    await putLocalEntity({
      entityType: 'brew',
      localId: 'local-operation',
      serverId: '42',
      data: { shot: { id: 42, doseGrams: '17.00' } },
      syncState: 'synced',
    })

    await cacheBrewDetail(42, {
      shot: { id: 42, doseGrams: '18.00' },
    })

    expect(await getLocalEntity('brew', 'local-operation')).toMatchObject({
      serverId: '42',
      syncState: 'synced',
      data: { shot: { id: 42, doseGrams: '18.00' } },
    })
    expect(await getLocalEntity('brew', '42')).toBeUndefined()
  })

  test('removes a cached detail using the canonical local entity ID', async () => {
    await putLocalEntity({
      entityType: 'brew',
      localId: 'local-operation',
      serverId: '42',
      data: { shot: { id: 42 } },
      syncState: 'synced',
    })

    await removeCachedBrewDetail(42)

    expect(await readCachedBrewDetail(42)).toBeUndefined()
    expect(await getLocalEntity('brew', 'local-operation')).toBeUndefined()
  })
})
