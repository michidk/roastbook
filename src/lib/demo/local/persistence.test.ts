import { afterEach, describe, expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import {
  type DemoSnapshot,
  openDemoStorage,
  readDemoSnapshot,
  saveDemoSnapshot,
} from './persistence'

const original = globalThis.indexedDB
afterEach(() => {
  globalThis.indexedDB = original
})

describe('demo storage preserves existing data', () => {
  test('reopening retains data and media and keeps standard storage isolated', async () => {
    globalThis.indexedDB = new IDBFactory()
    const snapshot: DemoSnapshot = {
      version: 1,
      revision: 'first',
      schemaVersion: '0001.sql',
      snapshot: new Blob(['journal']),
      media: [{ path: 'demo-local/test.webp', blob: new Blob(['picture']) }],
    }
    const first = await openDemoStorage()
    await saveDemoSnapshot(first, snapshot)
    first.close()
    const reopened = await openDemoStorage()
    const saved = await readDemoSnapshot(reopened)
    expect(saved?.revision).toBe('first')
    expect(await saved?.snapshot.text()).toBe('journal')
    expect(await saved?.media[0]?.blob.text()).toBe('picture')
    expect((await indexedDB.databases()).map(({ name }) => name)).toEqual([
      'roastbook-browser-demo',
    ])
    reopened.close()
  })

  test('unsupported data is rejected without replacing it', async () => {
    globalThis.indexedDB = new IDBFactory()
    const database = await openDemoStorage()
    const future = { version: 2, privateJournal: 'keep this' }
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('journal', 'readwrite')
      transaction.objectStore('journal').put(future, 'current')
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
    })
    await expect(readDemoSnapshot(database)).rejects.toThrow(
      'data is preserved',
    )
    const unchanged = await new Promise((resolve, reject) => {
      const request = database
        .transaction('journal')
        .objectStore('journal')
        .get('current')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    expect(unchanged).toEqual(future)
    database.close()
  })
})
