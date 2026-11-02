import { Readable } from 'node:stream'
import type { R2Bucket, R2UploadedPart } from '@cloudflare/workers-types'
import type { StorageProvider, StoredObject } from './types'

export function validateObjectKey(path: string): string {
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    Array.from(path).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    path.split('/').some((part) => part === '.' || part === '..' || !part)
  ) {
    throw new Error('Invalid storage path')
  }
  return path
}

const PART_BYTES = 8 * 1024 * 1024
const MAX_PARTS = 10_000

export async function uploadMultipart(
  bucket: R2Bucket,
  path: string,
  stream: ReadableStream<Uint8Array>,
): Promise<void> {
  validateObjectKey(path)
  const upload = await bucket.createMultipartUpload(path, {
    httpMetadata: { contentType: 'application/zip' },
  })
  const reader = stream.getReader()
  const parts: R2UploadedPart[] = []
  let buffer = new Uint8Array(PART_BYTES)
  let filled = 0
  let complete = false
  async function flush() {
    if (parts.length === MAX_PARTS)
      throw new Error('Archive exceeds storage limit')
    parts.push(
      await upload.uploadPart(parts.length + 1, buffer.subarray(0, filled)),
    )
    buffer = new Uint8Array(PART_BYTES)
    filled = 0
  }
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      let position = 0
      while (position < chunk.value.byteLength) {
        const length = Math.min(
          PART_BYTES - filled,
          chunk.value.byteLength - position,
        )
        buffer.set(chunk.value.subarray(position, position + length), filled)
        filled += length
        position += length
        if (filled === PART_BYTES) await flush()
      }
    }
    if (filled || !parts.length) await flush()
    await upload.complete(parts)
    complete = true
  } finally {
    if (!complete) {
      await reader.cancel().catch(() => undefined)
      await upload.abort().catch(() => undefined)
    }
    reader.releaseLock()
  }
}

export class R2StorageProvider implements StorageProvider {
  constructor(private readonly bucket: R2Bucket) {}
  async uploadStream(stream: Readable, path: string): Promise<void> {
    const iterator = stream[Symbol.asyncIterator]()
    const source = new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          try {
            const chunk = await iterator.next()
            if (chunk.done) controller.close()
            else if (chunk.value instanceof Uint8Array)
              controller.enqueue(chunk.value)
            else throw new Error('Expected binary stream')
          } catch (error) {
            controller.error(error)
          }
        },
        async cancel() {
          stream.destroy()
          await iterator.return?.()
        },
      },
      { highWaterMark: 0 },
    )
    await uploadMultipart(this.bucket, path, source)
  }
  async downloadStream(path: string): Promise<Readable> {
    const object = await this.bucket.get(validateObjectKey(path))
    if (!object) throw new Error('Storage object not found')
    const body = object.body
    async function* chunks() {
      const reader = body.getReader()
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) return
          yield chunk.value
        }
      } finally {
        await reader.cancel()
        reader.releaseLock()
      }
    }
    return Readable.from(chunks())
  }
  async upload(file: File | Blob, path: string): Promise<string> {
    await this.bucket.put(validateObjectKey(path), await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    })
    return this.getUrl(path)
  }
  async download(path: string): Promise<Blob> {
    const object = await this.bucket.get(validateObjectKey(path))
    if (!object) throw new Error('Storage object not found')
    return new Blob([await object.arrayBuffer()], {
      type: object.httpMetadata?.contentType || 'application/octet-stream',
    })
  }
  async delete(path: string) {
    await this.bucket.delete(validateObjectKey(path))
  }
  getUrl(path: string) {
    return `/media/${validateObjectKey(path).split('/').map(encodeURIComponent).join('/')}`
  }
  async exists(path: string) {
    return !!(await this.bucket.head(validateObjectKey(path)))
  }
  async list(prefix = '') {
    return (await this.listObjects(prefix)).map((object) => object.path)
  }
  async listObjects(prefix = ''): Promise<StoredObject[]> {
    if (prefix)
      validateObjectKey(prefix.endsWith('/') ? prefix.slice(0, -1) : prefix)
    const objects: StoredObject[] = []
    let cursor: string | undefined
    do {
      const page = await this.bucket.list({ prefix, cursor })
      objects.push(
        ...page.objects.map((object) => ({
          path: object.key,
          sizeBytes: object.size,
        })),
      )
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    return objects
  }
}
