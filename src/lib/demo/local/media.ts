import type { StorageProvider } from '@/lib/storage/types'

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
