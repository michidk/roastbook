import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'
import {
  assertEarlierChangesResolved,
  hasEarlierPendingChanges,
} from './legacy-recovery'
import {
  acknowledgeOperation,
  getOperation,
  putOperation,
  updateOperation,
} from './operation-queue'
import { DEFAULT_OWNER_KEY } from './operations'
import { resetOfflineDatabaseForTests } from './storage'

afterEach(resetOfflineDatabaseForTests)
test('earlier pending, conflicting and authentication-blocked work survives until explicitly resolved', async () => {
  const id = crypto.randomUUID()
  await putOperation({
    id,
    idempotencyKey: id,
    ownerKey: DEFAULT_OWNER_KEY,
    entityType: 'brew',
    operationType: 'create',
    entityLocalId: id,
    entityServerId: null,
    payload: { doseGrams: '18.00' },
    details: null,
    dependencyIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextAttemptAt: null,
    baseRevision: null,
    acknowledgedAt: null,
    cancelledAt: null,
    blobKeys: [],
  })
  for (const status of ['pending', 'conflict', 'auth-required'] as const) {
    await updateOperation(id, { status: 'pending' })
    await updateOperation(id, { status })
    expect(await hasEarlierPendingChanges()).toBe(true)
    await expect(assertEarlierChangesResolved()).rejects.toThrow(
      'Pending changes',
    )
    expect((await getOperation(id))?.payload).toEqual({ doseGrams: '18.00' })
  }
  await updateOperation(id, { status: 'pending' })
  await acknowledgeOperation(id, { serverId: '123' })
  expect(await hasEarlierPendingChanges()).toBe(false)
  await assertEarlierChangesResolved()
  expect((await getOperation(id))?.status).toBe('acknowledged')
})
