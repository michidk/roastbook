import { describe, expect, test } from 'bun:test'
import {
  canTransitionOperationStatus,
  DEFAULT_OWNER_KEY,
  isRunnableOperationStatus,
  isVisibleOperationStatus,
  type OfflineOperation,
  type OfflineOperationStatus,
  orderRunnableOperations,
} from '@/modules/offline/operations'

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
    payload: {},
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

describe('offline operation state machine', () => {
  test('allows forward transitions and blocks terminal records', () => {
    expect(canTransitionOperationStatus('pending', 'in-flight')).toBe(true)
    expect(canTransitionOperationStatus('in-flight', 'acknowledged')).toBe(true)
    expect(canTransitionOperationStatus('permanent', 'pending')).toBe(true)
    expect(canTransitionOperationStatus('auth-required', 'pending')).toBe(true)
    expect(canTransitionOperationStatus('acknowledged', 'pending')).toBe(false)
    expect(canTransitionOperationStatus('cancelled', 'pending')).toBe(false)
  })

  test('distinguishes runnable and visible statuses', () => {
    const statuses: OfflineOperationStatus[] = [
      'pending',
      'in-flight',
      'retryable',
      'permanent',
      'auth-required',
      'conflict',
      'cancelled',
      'acknowledged',
    ]

    expect(statuses.filter(isRunnableOperationStatus)).toEqual([
      'pending',
      'retryable',
    ])
    expect(statuses.filter(isVisibleOperationStatus)).toEqual([
      'pending',
      'in-flight',
      'retryable',
      'permanent',
      'auth-required',
      'conflict',
    ])
  })
})

describe('offline operation ordering', () => {
  test('waits for create dependencies and then releases dependants in order', () => {
    const create = operation({
      id: 'create',
      createdAt: '2026-10-24T08:00:00.000Z',
    })
    const image = operation({
      id: 'image',
      entityType: 'brew-image',
      operationType: 'upload',
      createdAt: '2026-10-24T08:00:01.000Z',
      dependencyIds: [create.id],
    })
    const recipe = operation({
      id: 'recipe',
      entityType: 'recipe',
      operationType: 'save-to-recipe',
      createdAt: '2026-10-24T08:00:02.000Z',
      dependencyIds: [create.id],
    })

    expect(
      orderRunnableOperations([recipe, image, create]).map((item) => item.id),
    ).toEqual(['create'])

    const acknowledgedCreate = {
      ...create,
      status: 'acknowledged' as const,
      acknowledgedAt: '2026-10-24T08:00:03.000Z',
    }
    expect(
      orderRunnableOperations([recipe, image, acknowledgedCreate]).map(
        (item) => item.id,
      ),
    ).toEqual(['image', 'recipe'])
  })

  test('does not run operations with missing or unfinished dependencies', () => {
    const missing = operation({
      id: 'missing',
      dependencyIds: ['does-not-exist'],
    })
    const waiting = operation({
      id: 'waiting',
      dependencyIds: ['create'],
    })
    const create = operation({ id: 'create' })

    expect(orderRunnableOperations([missing, waiting, create])).toEqual([
      create,
    ])
    expect(
      orderRunnableOperations([
        { ...waiting, dependencyIds: ['cancelled'] },
        { ...create, status: 'cancelled' as const },
      ]),
    ).toEqual([])
  })

  test('honours retry times and only runs pending or retryable records', () => {
    const future = operation({
      id: 'future',
      nextAttemptAt: '2026-10-24T09:00:00.000Z',
    })
    const retrying = operation({
      id: 'retrying',
      status: 'retryable',
      nextAttemptAt: '2026-10-24T07:00:00.000Z',
      createdAt: '2026-10-24T08:00:01.000Z',
    })
    const inFlight = operation({ id: 'in-flight', status: 'in-flight' })
    const acknowledged = operation({
      id: 'acknowledged',
      status: 'acknowledged',
    })

    expect(
      orderRunnableOperations(
        [future, retrying, inFlight, acknowledged],
        new Date('2026-10-24T08:30:00.000Z'),
      ).map((item) => item.id),
    ).toEqual(['retrying'])
  })

  test('sorts same-timestamp operations deterministically by id', () => {
    const second = operation({ id: 'b' })
    const first = operation({ id: 'a' })

    expect(
      orderRunnableOperations([second, first]).map((item) => item.id),
    ).toEqual(['a', 'b'])
  })
})
