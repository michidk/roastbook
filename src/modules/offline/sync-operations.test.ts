import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_OWNER_KEY,
  type OfflineOperation,
  type OfflineOperationStatus,
} from '@/modules/offline/operations'
import {
  type OperationExecutionResult,
  type SyncOperationsDependencies,
  syncOperations,
} from '@/modules/offline/sync-operations'

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
    payload: { label: id },
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

function createRepository(initial: readonly OfflineOperation[]) {
  const items = new Map(initial.map((item) => [item.id, item]))

  return {
    list: () => Promise.resolve([...items.values()]),
    claim: (operation: OfflineOperation) => {
      const item = items.get(operation.id)
      if (item) {
        items.set(operation.id, {
          ...item,
          status: 'in-flight',
          attempts: item.attempts + 1,
        })
      }
      return Promise.resolve()
    },
    acknowledge: (
      operation: OfflineOperation,
      result: OperationExecutionResult,
    ) => {
      const item = items.get(operation.id)
      if (item) {
        items.set(operation.id, {
          ...item,
          status: 'acknowledged',
          entityServerId: result.serverId ?? item.entityServerId,
          acknowledgedAt: '2026-10-24T08:01:00.000Z',
        })
      }
      return Promise.resolve()
    },
    mark: (
      operation: OfflineOperation,
      changes: {
        readonly status: OfflineOperationStatus
        readonly lastError?: string | null
      },
    ) => {
      const item = items.get(operation.id)
      if (item) {
        items.set(operation.id, {
          ...item,
          status: changes.status,
          lastError: changes.lastError ?? item.lastError,
        })
      }
      return Promise.resolve()
    },
    get: (id: string) => items.get(id),
  }
}

function dependencies(
  repository: ReturnType<typeof createRepository>,
  overrides: Partial<SyncOperationsDependencies> = {},
): SyncOperationsDependencies {
  return {
    list: repository.list,
    claim: repository.claim,
    acknowledge: repository.acknowledge,
    mark: repository.mark,
    execute: () => Promise.resolve(undefined),
    authenticate: () => Promise.resolve('authenticated'),
    isOnline: () => true,
    now: () => new Date('2026-10-24T08:30:00.000Z'),
    ...overrides,
  }
}

describe('offline operation sync', () => {
  test('executes dependent operations in order and acknowledges each result', async () => {
    const create = operation({ id: 'create' })
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
    const repository = createRepository([recipe, image, create])
    const executed: string[] = []
    const acknowledged: string[] = []

    const result = await syncOperations(
      dependencies(repository, {
        execute: (item) => {
          executed.push(item.id)
          return Promise.resolve({ serverId: `server-${item.id}` })
        },
        onAcknowledged: (item, executionResult) => {
          acknowledged.push(`${item.id}:${executionResult.serverId}`)
          return Promise.resolve()
        },
      }),
    )

    expect(result).toEqual({
      synced: 3,
      authRequired: false,
      stoppedByNetwork: false,
      failed: 0,
    })
    expect(executed).toEqual(['create', 'image', 'recipe'])
    expect(acknowledged).toEqual([
      'create:server-create',
      'image:server-image',
      'recipe:server-recipe',
    ])
    expect(repository.get('create')).toMatchObject({
      status: 'acknowledged',
      entityServerId: 'server-create',
    })
  })

  test('does not execute while offline', async () => {
    const repository = createRepository([operation()])
    let executions = 0

    const result = await syncOperations(
      dependencies(repository, {
        isOnline: () => false,
        execute: () => {
          executions += 1
          return Promise.resolve(undefined)
        },
      }),
    )

    expect(result.stoppedByNetwork).toBe(true)
    expect(executions).toBe(0)
  })

  test('does not probe authentication when nothing is runnable', async () => {
    const repository = createRepository([
      operation({ id: 'auth', status: 'auth-required' }),
      operation({ id: 'failed', status: 'permanent' }),
    ])
    let probes = 0

    const result = await syncOperations(
      dependencies(repository, {
        authenticate: () => {
          probes += 1
          return Promise.resolve('auth-required')
        },
      }),
    )

    expect(result).toEqual({
      synced: 0,
      authRequired: false,
      stoppedByNetwork: false,
      failed: 0,
    })
    expect(probes).toBe(0)
  })

  test('waits for cancelled or unfinished dependencies', async () => {
    const create = operation({ id: 'create', status: 'cancelled' })
    const dependent = operation({
      id: 'dependent',
      entityType: 'brew-image',
      operationType: 'upload',
      dependencyIds: [create.id],
    })
    const repository = createRepository([create, dependent])
    let executions = 0

    const result = await syncOperations(
      dependencies(repository, {
        execute: () => {
          executions += 1
          return Promise.resolve(undefined)
        },
      }),
    )

    expect(executions).toBe(0)
    expect(result.synced).toBe(0)
    expect(repository.get('dependent')?.status).toBe('pending')
  })

  test('marks every runnable operation when authentication expired', async () => {
    const first = operation({ id: 'first' })
    const second = operation({ id: 'second', status: 'retryable' })
    const repository = createRepository([first, second])

    const result = await syncOperations(
      dependencies(repository, {
        authenticate: () => Promise.resolve('auth-required'),
      }),
    )

    expect(result.authRequired).toBe(true)
    expect(repository.get('first')?.status).toBe('auth-required')
    expect(repository.get('second')?.status).toBe('auth-required')
  })

  test('keeps a validation failure permanent and continues with the next operation', async () => {
    const first = operation({ id: 'first' })
    const second = operation({
      id: 'second',
      createdAt: '2026-10-24T08:00:01.000Z',
    })
    const repository = createRepository([first, second])

    const result = await syncOperations(
      dependencies(repository, {
        execute: (item) => {
          if (item.id === first.id) {
            return Promise.reject(new Error('Selected bag not found'))
          }
          return Promise.resolve(undefined)
        },
      }),
    )

    expect(result.synced).toBe(1)
    expect(result.failed).toBe(1)
    expect(repository.get('first')).toMatchObject({
      status: 'permanent',
      lastError: 'Selected bag not found',
    })
    expect(repository.get('second')?.status).toBe('acknowledged')
  })

  test('stops on a network failure and leaves the operation retryable', async () => {
    const item = operation({ id: 'network' })
    const repository = createRepository([item])

    const result = await syncOperations(
      dependencies(repository, {
        execute: () => Promise.reject(new TypeError('Failed to fetch')),
      }),
    )

    expect(result.stoppedByNetwork).toBe(true)
    expect(repository.get('network')).toMatchObject({
      status: 'retryable',
      lastError: 'Failed to fetch',
    })
  })

  test('keeps a transient server failure retryable for the next flush', async () => {
    const item = operation({ id: 'transient' })
    const repository = createRepository([item])

    const result = await syncOperations(
      dependencies(repository, {
        execute: () => Promise.reject(new Error('Internal Server Error')),
      }),
    )

    expect(result.stoppedByNetwork).toBe(true)
    expect(result.failed).toBe(0)
    expect(repository.get('transient')).toMatchObject({
      status: 'retryable',
      lastError: 'Internal Server Error',
    })
  })

  test('marks a server conflict without retrying it automatically', async () => {
    const item = operation({ id: 'conflict' })
    const repository = createRepository([item])

    const result = await syncOperations(
      dependencies(repository, {
        execute: () =>
          Promise.reject(
            new Error('This brew changed on the server. Reload and try again.'),
          ),
      }),
    )

    expect(result.failed).toBe(1)
    expect(result.stoppedByNetwork).toBe(false)
    expect(repository.get('conflict')).toMatchObject({
      status: 'conflict',
    })
  })

  test('stops when the auth probe becomes unreachable after a failure', async () => {
    const repository = createRepository([operation({ id: 'unreachable' })])
    let probes = 0

    const result = await syncOperations(
      dependencies(repository, {
        authenticate: () => {
          probes += 1
          return Promise.resolve(probes === 1 ? 'authenticated' : 'unreachable')
        },
        execute: () => Promise.reject(new Error('Server error')),
      }),
    )

    expect(result.stoppedByNetwork).toBe(true)
    expect(repository.get('unreachable')?.status).toBe('retryable')
  })

  test('does not let an acknowledgement callback failure break the flush', async () => {
    const repository = createRepository([operation({ id: 'callback' })])

    const result = await syncOperations(
      dependencies(repository, {
        execute: () => Promise.resolve({ serverId: '7' }),
        onAcknowledged: () => Promise.reject(new Error('local cache failed')),
      }),
    )

    expect(result.synced).toBe(1)
    expect(repository.get('callback')).toMatchObject({
      status: 'acknowledged',
      entityServerId: '7',
    })
  })
})
