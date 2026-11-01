import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  cacheEntityDetail,
  readCachedEntityDetail,
  removeCachedEntityDetail,
} from '@/modules/offline/entity-detail-cache'
import {
  getLocalEntityByServerId,
  listLocalEntities,
  putLocalEntity,
} from '@/modules/offline/local-data'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('cached entity details', () => {
  test('preserves nested dates used by saved detail and edit forms', async () => {
    const brewedAt = new Date('2026-10-25T09:30:00.000Z')
    const data = {
      shot: { id: 9, brewedAt },
      beans: [{ purchases: [{ purchasedAt: brewedAt }] }],
    }
    await cacheEntityDetail('brew', 9, data)
    expect((await readCachedEntityDetail('brew', 9))?.data).toEqual(data)
  })

  test('stores and updates recipe details by server ID', async () => {
    await cacheEntityDetail('recipe', 7, {
      recipe: { id: 7, name: 'Morning' },
      beans: [{ id: 1, name: 'Konga' }],
    })

    expect(await readCachedEntityDetail('recipe', 7)).toMatchObject({
      data: {
        recipe: { id: 7, name: 'Morning' },
        beans: [{ id: 1, name: 'Konga' }],
      },
    })

    await cacheEntityDetail('recipe', 7, {
      recipe: { id: 7, name: 'Morning v2' },
      beans: [],
    })

    expect(await readCachedEntityDetail('recipe', 7)).toMatchObject({
      data: { recipe: { id: 7, name: 'Morning v2' }, beans: [] },
    })
    expect(await listLocalEntities({ entityType: 'recipe' })).toHaveLength(1)
  })

  test('removes a cached entity by server ID', async () => {
    await cacheEntityDetail('bean', '42', {
      bean: { id: 42, name: 'Moonrise' },
    })

    expect(await getLocalEntityByServerId('bean', '42')).toBeDefined()
    await removeCachedEntityDetail('bean', 42)
    expect(await getLocalEntityByServerId('bean', '42')).toBeUndefined()
    expect(await readCachedEntityDetail('bean', 42)).toBeUndefined()
  })

  test('does not overwrite an entity with a conflict', async () => {
    await putLocalEntity({
      entityType: 'recipe',
      localId: '7',
      serverId: '7',
      data: { recipe: { id: 7, name: 'Conflicted edit' } },
      syncState: 'conflict',
    })

    await cacheEntityDetail('recipe', 7, {
      recipe: { id: 7, name: 'Server copy' },
    })

    expect(await readCachedEntityDetail('recipe', 7)).toMatchObject({
      data: { recipe: { id: 7, name: 'Conflicted edit' } },
    })
  })

  test('does not overwrite an entity with pending local changes', async () => {
    await putLocalEntity({
      entityType: 'recipe',
      localId: '7',
      serverId: '7',
      data: { recipe: { id: 7, name: 'Local edit' } },
      syncState: 'pending',
    })

    await cacheEntityDetail('recipe', 7, {
      recipe: { id: 7, name: 'Server copy' },
    })

    expect(await readCachedEntityDetail('recipe', 7)).toMatchObject({
      data: { recipe: { id: 7, name: 'Local edit' } },
    })
  })
})
