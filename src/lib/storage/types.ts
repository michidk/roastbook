import type { Readable } from 'node:stream'
export interface StoredObject {
  path: string
  sizeBytes: number
}

export interface StorageProvider {
  uploadStream(stream: Readable, path: string): Promise<void>
  downloadStream(path: string): Promise<Readable>
  upload(file: File | Blob, path: string): Promise<string>
  download(path: string): Promise<Blob>
  delete(path: string): Promise<void>
  getUrl(path: string): string
  stat(path: string): Promise<StoredObject | null>
  exists(path: string): Promise<boolean>
  list(prefix?: string): Promise<string[]>
  listObjects(prefix?: string): Promise<StoredObject[]>
}

export interface StorageConfig {
  provider: 'local' | 's3'
  local?: {
    basePath: string
    baseUrl: string
  }
  s3?: {
    bucket: string
    region: string
    endpoint?: string
    accessKeyId: string
    secretAccessKey: string
  }
}
