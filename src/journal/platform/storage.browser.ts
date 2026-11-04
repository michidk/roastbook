// Browser platform: picture bytes live in the local journal database, so a
// picture and its record always commit together.
import { sql } from 'drizzle-orm'
import { currentScope } from '@/journal/local/client'
import { rememberLocalMedia } from '@/journal/local/media'
import { imageUrl } from '@/lib/image-url'
import { generateStoragePath as generate } from '@/lib/storage/path'
import type { StorageProvider } from '@/lib/storage/types'

export type { StorageProvider }

function transaction() {
  const scope = currentScope()
  if (!scope) throw new Error('Picture storage requires a local journal scope')
  return scope
}

/** The server replay reuses the path chosen here. */
export function generateStoragePath(...args: Parameters<typeof generate>) {
  const scope = transaction()
  if (scope.replaying) {
    const [path] = scope.recorded.storagePath?.splice(0, 1) ?? []
    if (typeof path !== 'string')
      throw new Error('The saved change no longer matches its picture')
    return path
  }
  const path = generate(...args)
  scope.recorded.storagePath = [...(scope.recorded.storagePath ?? []), path]
  return path
}

const unsupported = () => {
  throw new Error('Streaming is not available in browser storage')
}

const provider: StorageProvider = {
  async upload(file, path) {
    const scope = transaction()
    const bytes = new Uint8Array(await file.arrayBuffer())
    await scope.tx.execute(
      sql`insert into roastbook_local.media (path, mime_type, data) values (${path}, ${file.type || 'image/webp'}, ${bytes}) on conflict (path) do update set mime_type = excluded.mime_type, data = excluded.data`,
    )
    scope.committed.push(() => rememberLocalMedia(path, file))
    return path
  },
  async download(path) {
    const result = await transaction().tx.execute<{
      mime_type: string
      data: Uint8Array
    }>(
      sql`select mime_type, data from roastbook_local.media where path = ${path}`,
    )
    const row = result.rows[0]
    if (!row) throw new Error('Picture not found')
    return new Blob([row.data as BlobPart], { type: row.mime_type })
  },
  async delete(path) {
    const scope = transaction()
    await scope.tx.execute(
      sql`delete from roastbook_local.media where path = ${path}`,
    )
  },
  getUrl: (path) => imageUrl(path),
  async stat(path) {
    const result = await transaction().tx.execute<{ size: number }>(
      sql`select octet_length(data) as size from roastbook_local.media where path = ${path}`,
    )
    const row = result.rows[0]
    return row ? { path, sizeBytes: Number(row.size) } : null
  },
  async exists(path) {
    return (await this.stat(path)) !== null
  },
  async list(prefix = '') {
    const result = await transaction().tx.execute<{ path: string }>(
      sql`select path from roastbook_local.media where starts_with(path, ${prefix})`,
    )
    return result.rows.map((row) => row.path)
  },
  async listObjects(prefix = '') {
    const result = await transaction().tx.execute<{
      path: string
      size: number
    }>(
      sql`select path, octet_length(data) as size from roastbook_local.media where starts_with(path, ${prefix})`,
    )
    return result.rows.map((row) => ({ path: row.path, sizeBytes: row.size }))
  },
  uploadStream: unsupported,
  downloadStream: unsupported,
}

export function getStorage(): StorageProvider {
  return provider
}
