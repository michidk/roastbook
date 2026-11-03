import { z } from 'zod'

export const DEMO_DATABASE_NAME = 'roastbook-browser-demo'
export const DEMO_DATABASE_VERSION = 1
const snapshotSchema = z.object({
  version: z.literal(DEMO_DATABASE_VERSION),
  revision: z.string().min(1),
  schemaVersion: z.string(),
  snapshot: z.instanceof(Blob),
  media: z.array(z.object({ path: z.string(), blob: z.instanceof(Blob) })),
})
export type DemoSnapshot = z.infer<typeof snapshotSchema>

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function openDemoStorage(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined')
    throw new Error(
      'Browser storage is unavailable. Allow site storage and try again. Your saved demo has not been changed.',
    )
  return new Promise((resolve, reject) => {
    let blocked = false
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DEMO_DATABASE_NAME, 1)
    } catch {
      reject(
        new Error(
          'Browser storage is blocked. Allow site storage and retry. Your saved demo has not been changed.',
        ),
      )
      return
    }
    request.onupgradeneeded = () => request.result.createObjectStore('journal')
    request.onblocked = () => {
      blocked = true
      reject(
        new Error(
          'Another tab is updating the browser demo. Close older demo tabs and retry. Your saved journal is preserved.',
        ),
      )
    }
    request.onerror = () =>
      reject(
        new Error(
          'Browser storage is unavailable or uses a newer version. Allow site storage or update Roastbook, then retry. Your saved demo has not been changed.',
        ),
      )
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => database.close()
      if (blocked) database.close()
      else resolve(database)
    }
  })
}

export async function readDemoSnapshot(
  database: IDBDatabase,
): Promise<DemoSnapshot | undefined> {
  const stored: unknown = await requestResult(
    database.transaction('journal').objectStore('journal').get('current'),
  )
  if (stored === undefined) return undefined
  const result = snapshotSchema.safeParse(stored)
  if (!result.success)
    throw new Error(
      'This saved demo uses an unsupported storage version. Your data is preserved. Open the version of Roastbook that saved it or export your browser site data before resetting.',
    )
  return result.data
}

export function saveDemoSnapshot(
  database: IDBDatabase,
  snapshot: DemoSnapshot,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const failed = () =>
      reject(
        new Error(
          'Could not save the demo in this browser. Storage may be full or blocked. Your previous saved journal is preserved. Free space or allow site storage, then retry.',
        ),
      )
    try {
      const transaction = database.transaction('journal', 'readwrite', {
        durability: 'strict',
      })
      transaction.objectStore('journal').put(snapshot, 'current')
      transaction.oncomplete = () => resolve()
      transaction.onabort = failed
      transaction.onerror = () => undefined
    } catch {
      failed()
    }
  })
}
