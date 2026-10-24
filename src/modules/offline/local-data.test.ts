import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  getLocalEntity,
  listLocalEntities,
  markLocalEntitySynced,
  OFFLINE_SCHEMA_VERSION,
  putLocalEntity,
  readOfflineSyncMetadata,
  recordSuccessfulSync,
  removeLocalEntity,
  tombstoneLocalEntity,
} from '@/modules/offline/local-data'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('offline local data', () => {
  test('stores owner-scoped entities and tracks their sync state', async () => {
    const brew = await putLocalEntity({
      entityType: 'brew',
      localId: 'brew-1',
      data: { doseGrams: '18.00' },
    })
    await putLocalEntity({
      entityType: 'recipe',
      localId: 'recipe-1',
      data: { name: 'Morning' },
    })
    await putLocalEntity({
      entityType: 'brew',
      localId: 'brew-1',
      ownerKey: 'other-owner',
      data: { doseGrams: '20.00' },
    })

    expect(await getLocalEntity('brew', 'brew-1')).toMatchObject({
      key: brew.key,
      data: { doseGrams: '18.00' },
      syncState: 'local',
    })
    expect(await getLocalEntity('brew', 'brew-1', 'other-owner')).toMatchObject(
      {
        data: { doseGrams: '20.00' },
      },
    )
    expect(await getLocalEntity('brew', 'missing')).toBeUndefined()

    expect((await listLocalEntities()).map((item) => item.entityType)).toEqual([
      'brew',
      'recipe',
    ])
    expect(
      (await listLocalEntities({ entityType: 'brew' })).map(
        (item) => item.localId,
      ),
    ).toEqual(['brew-1'])

    const synced = await markLocalEntitySynced('brew', 'brew-1', {
      serverId: '42',
      revision: '2026-10-24T08:00:00.000Z',
    })
    expect(synced).toMatchObject({
      serverId: '42',
      syncState: 'synced',
      revision: '2026-10-24T08:00:00.000Z',
    })

    const tombstoned = await tombstoneLocalEntity('brew', 'brew-1')
    expect(tombstoned?.deletedAt).not.toBeNull()
    expect(tombstoned?.syncState).toBe('pending')
    expect(await listLocalEntities()).toHaveLength(1)
    expect(await listLocalEntities({ includeDeleted: true })).toHaveLength(2)

    await removeLocalEntity('brew', 'brew-1')
    expect(await getLocalEntity('brew', 'brew-1')).toBeUndefined()
  })

  test('records last successful sync metadata per owner', async () => {
    expect(await readOfflineSyncMetadata()).toEqual({
      ownerKey: 'local',
      schemaVersion: OFFLINE_SCHEMA_VERSION,
      lastSuccessfulSyncAt: null,
    })

    const synced = await recordSuccessfulSync(
      'local',
      '2026-10-24T08:30:00.000Z',
    )
    expect(synced).toMatchObject({
      lastSuccessfulSyncAt: '2026-10-24T08:30:00.000Z',
    })
    expect(await readOfflineSyncMetadata()).toEqual(synced)
    expect(await readOfflineSyncMetadata('other-owner')).toMatchObject({
      ownerKey: 'other-owner',
      lastSuccessfulSyncAt: null,
    })
  })
})
