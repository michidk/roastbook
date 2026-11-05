import '@tanstack/react-start/server-only'
import { createServerOnlyFn } from '@tanstack/react-start'
import { R2StorageProvider, uploadMultipart } from '@/cloudflare/r2'
import { requireCloudflareRuntime } from './context.server'

export { generateStoragePath } from '@/lib/storage/path'
export type { StorageProvider } from '@/lib/storage/types'
export const getStorage = createServerOnlyFn(
  () => new R2StorageProvider(requireCloudflareRuntime().bindings.MEDIA),
)
export async function uploadArchive(
  path: string,
  body: ReadableStream<Uint8Array>,
) {
  await uploadMultipart(requireCloudflareRuntime().bindings.MEDIA, path, body)
}
