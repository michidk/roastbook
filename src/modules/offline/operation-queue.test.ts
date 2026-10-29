import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  acknowledgeOperation,
  cancelOperation,
  getOperation,
  listOperations,
  putOperation,
  recoverInterruptedOperations,
  updateOperation,
} from '@/modules/offline/operation-queue'
import {
  DEFAULT_OWNER_KEY,
  type OfflineOperation,
} from '@/modules/offline/operations'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'

function operation(
  overrides: Partial<OfflineOperation> = {},
): OfflineOperation {
  const id = overrides.id ?? crypto.randomUUID()
  return {
    id,
    idempotencyKey: id,
    ownerKey: DEFAULT_OWNER_KEY,
    entityType: 'brew',
    operationType: 'create',
    entityLocalId: id,
    entityServerId: null,
    payload: { value: 'test' },
    details: null,
    dependencyIds: [],
    createdAt: '2026-10-24T08:00:00.000Z',
    updatedAt: '2026-10-24T08:00:00.000Z',
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextAttemptAt: null,
    baseRevision: null,
    acknowledgedAt: null,
    cancelledAt: null,
    blobKeys: [],
    ...overrides,
  }
}

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('offline operation queue', () => {
  test('stores operations in creation order and filters by owner and entity', async () => {
    const second = operation({
      id: 'second',
      createdAt: '2026-10-24T08:00:02.000Z',
    })
    const first = operation({
      id: 'first',
      createdAt: '2026-10-24T08:00:01.000Z',
    })
    const otherOwner = operation({
      id: 'other-owner',
      ownerKey: 'another-device',
    })
    const image = operation({
      id: 'image',
      entityType: 'brew-image',
      operationType: 'upload',
      createdAt: '2026-10-24T08:00:03.000Z',
    })

    await putOperation(second)
    await putOperation(first)
    await putOperation(otherOwner)
    await putOperation(image)

    expect((await listOperations()).map((item) => item.id)).toEqual([
      'first',
      'second',
      'image',
    ])
    expect(
      (await listOperations({ entityType: 'brew-image' })).map(
        (item) => item.id,
      ),
    ).toEqual(['image'])
    expect(
      (await listOperations({ ownerKey: 'another-device' })).map(
        (item) => item.id,
      ),
    ).toEqual(['other-owner'])
  })

  test('tracks state changes, acknowledgement, and cancellation', async () => {
    const item = operation({ id: 'stateful' })
    await putOperation(item)

    await updateOperation(item.id, {
      status: 'in-flight',
      attempts: 1,
    })
    expect(await getOperation(item.id)).toMatchObject({
      status: 'in-flight',
      attempts: 1,
    })

    await acknowledgeOperation(item.id, { serverId: '42' })
    expect(await getOperation(item.id)).toMatchObject({
      status: 'acknowledged',
      entityServerId: '42',
    })
    expect((await getOperation(item.id))?.acknowledgedAt).not.toBeNull()

    await expect(updateOperation(item.id, { attempts: 2 })).rejects.toThrow(
      'cannot be changed',
    )
    await expect(putOperation(item)).rejects.toThrow('cannot be replaced')

    const cancelled = operation({ id: 'cancelled' })
    await putOperation(cancelled)
    await cancelOperation(cancelled.id)
    expect(await getOperation(cancelled.id)).toMatchObject({
      status: 'cancelled',
    })
    expect((await getOperation(cancelled.id))?.cancelledAt).not.toBeNull()
  })

  test('rejects invalid state transitions', async () => {
    const item = operation({ id: 'invalid', status: 'retryable' })
    await putOperation(item)

    await expect(
      updateOperation(item.id, { status: 'acknowledged' }),
    ).rejects.toThrow('Cannot move an offline operation')
  })

  test('refuses to cancel an operation that another tab is syncing', async () => {
    await putOperation(operation({ id: 'in-flight', status: 'in-flight' }))

    await expect(cancelOperation('in-flight')).rejects.toThrow(
      'Wait for the current sync to finish',
    )
    expect((await getOperation('in-flight'))?.status).toBe('in-flight')
  })

  test('recovers operations left in flight by a closed tab', async () => {
    await putOperation(operation({ id: 'interrupted', status: 'in-flight' }))

    expect(await recoverInterruptedOperations()).toBe(1)
    expect(await getOperation('interrupted')).toMatchObject({
      status: 'retryable',
      lastError: 'The previous sync was interrupted',
    })
  })
})
