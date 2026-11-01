import { DEMO_MODE } from '@/lib/build-mode'
import { canUseOfflineCache } from './errors'

export type SavedSnapshot<T> = { readonly data: T; readonly savedAt: string }

/** Cache failures never hide server/domain errors or turn a successful read into a failure. */
export async function readWithCache<T>({
  load,
  read,
  write,
  accepts = () => true,
}: {
  readonly load: () => Promise<T>
  readonly read: () => Promise<SavedSnapshot<T> | undefined>
  readonly write?: (data: T) => Promise<void>
  readonly accepts?: (data: T) => boolean
}): Promise<{ readonly value: T; readonly savedAt?: string }> {
  try {
    const data = await load()
    if (!DEMO_MODE && typeof window !== 'undefined' && write)
      await write(data).catch(() => undefined)
    return { value: data }
  } catch (error) {
    if (!canUseOfflineCache(error)) throw error
    const cached = await read().catch(() => undefined)
    if (cached && accepts(cached.data))
      return { value: cached.data, savedAt: cached.savedAt }
    throw error
  }
}

export async function loadCached<T extends object>(
  options: Parameters<typeof readWithCache<T>>[0],
): Promise<T & { readonly offlineSnapshotSavedAt?: string }> {
  const result = await readWithCache(options)
  return result.savedAt
    ? { ...result.value, offlineSnapshotSavedAt: result.savedAt }
    : result.value
}
