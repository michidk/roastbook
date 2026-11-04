// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import {
  isReplayedPath,
  isUploadedPath,
  markReplayedPath,
  markUploadedPath,
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

const original = (path: string) =>
  path.replace(/\.(thumb|small)\.webp$/, '.webp')

/**
 * A replayed path never overwrites an existing object, in any size, and a
 * failed replay deletes only the objects it uploaded itself.
 */
export function getStorage(): StorageProvider {
  const provider = storage()
  return new Proxy(provider, {
    get(target, property) {
      if (property === 'upload')
        return async (file: File | Blob, path: string) => {
          if (!isReplayedPath(original(path))) return target.upload(file, path)
          if (await target.exists(path))
            throw new Error('Replayed storage path already exists')
          const uploaded = await target.upload(file, path)
          markUploadedPath(path)
          return uploaded
        }
      if (property === 'delete')
        return async (path: string) => {
          if (isReplayedPath(original(path)) && !isUploadedPath(path)) return
          return target.delete(path)
        }
      return Reflect.get(target, property)
    },
  })
}
