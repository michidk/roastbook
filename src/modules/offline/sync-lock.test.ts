import { describe, expect, test } from 'bun:test'
import {
  OFFLINE_SYNC_LOCK_NAME,
  withOfflineSyncLock,
} from '@/modules/offline/sync-lock'

describe('offline sync lock', () => {
  test('uses Web Locks when available', async () => {
    const requests: string[] = []
    const locks = {
      request: <T>(name: string, callback: () => Promise<T>) => {
        requests.push(name)
        return callback()
      },
    }

    const result = await withOfflineSyncLock(
      () => Promise.resolve('synced'),
      locks,
    )

    expect(result).toBe('synced')
    expect(requests).toEqual([OFFLINE_SYNC_LOCK_NAME])
  })

  test('falls back to a direct run without Web Locks', async () => {
    let runs = 0

    const result = await withOfflineSyncLock(() => {
      runs += 1
      return Promise.resolve('direct')
    }, null)

    expect(result).toBe('direct')
    expect(runs).toBe(1)
  })

  test('propagates sync failures through the lock', async () => {
    const locks = {
      request: <T>(_name: string, callback: () => Promise<T>) => callback(),
    }

    await expect(
      withOfflineSyncLock(
        () => Promise.reject(new Error('sync failed')),
        locks,
      ),
    ).rejects.toThrow('sync failed')
  })
})
