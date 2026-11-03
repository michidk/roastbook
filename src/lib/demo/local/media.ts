import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  shotImages,
} from '@/db/schema'
import { getStoredImagePaths } from '@/lib/image-path'
import type { StorageProvider } from '@/lib/storage/types'
import { getDb } from './database'
import { owned } from './scope'

export const demoMedia = new Map<string, Blob>()

export const getStorage = (): StorageProvider => ({
  async upload(file, path) {
    demoMedia.set(path, file)
    return path
  },
  async download(path) {
    const file = demoMedia.get(path)
    if (!file) throw new Error('Picture not found')
    return file
  },
  async delete(path) {
    demoMedia.delete(path)
  },
  getUrl: (path) => path,
  exists: async (path) => demoMedia.has(path),
  stat: async (path) => {
    const blob = demoMedia.get(path)
    return blob ? { path, sizeBytes: blob.size } : null
  },
  list: async () => [...demoMedia.keys()],
  listObjects: async () =>
    [...demoMedia].map(([path, blob]) => ({ path, sizeBytes: blob.size })),
  uploadStream: async () => {
    throw new Error('Streaming uploads are unavailable in the demo')
  },
  downloadStream: async () => {
    throw new Error('Streaming downloads are unavailable in the demo')
  },
})

/** Cascading parent deletions can remove image rows before domain cleanup runs. */
export async function pruneDemoMedia() {
  const groups = await Promise.all(
    [beanImages, cafeVisitImages, coffeeShopImages, gearImages, shotImages].map(
      (table) =>
        getDb()
          .select({ path: table.storagePath })
          .from(table)
          .where(owned(table)),
    ),
  )
  const retained = new Set(
    getStoredImagePaths(groups.flat().map(({ path }) => path)),
  )
  for (const path of demoMedia.keys())
    if (!retained.has(path)) demoMedia.delete(path)
}
