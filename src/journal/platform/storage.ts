// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import {
  isReplayedPath,
  markReplayedPath,
  takeRecordedValues,
} from '@/db/journal-replay.server'
import {
  generateStoragePath as generate,
  type StorageProvider,
  getStorage as storage,
} from '@/lib/storage'

export type { StorageProvider }

const replayedPath =
  /^(beans|gear|coffee-shops|shots|cafe-visits)\/(\d+)\/\d+-[0-9a-f-]{36}\.webp$/

/** Replays reuse the path the browser chose, after checking its shape. */
export function generateStoragePath(
  ...args: Parameters<typeof generate>
): string {
  const [recorded] = takeRecordedValues('storagePath', 1) ?? []
  if (recorded === undefined) return generate(...args)
  const match = typeof recorded === 'string' && replayedPath.exec(recorded)
  if (!match || match[1] !== args[0] || Number(match[2]) !== args[1])
    throw new Error('Invalid replayed storage path')
  markReplayedPath(recorded as string)
  return recorded as string
}

/** Never let a replayed path overwrite an existing object. */
export function getStorage(): StorageProvider {
  const provider = storage()
  return new Proxy(provider, {
    get(target, property) {
      if (property !== 'upload') return Reflect.get(target, property)
      return async (file: File | Blob, path: string) => {
        if (isReplayedPath(path) && (await target.exists(path)))
          throw new Error('Replayed storage path already exists')
        return target.upload(file, path)
      }
    },
  })
}
