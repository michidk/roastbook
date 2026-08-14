export interface StoredObject {
  path: string
  sizeBytes: number
}

export interface StorageProvider {
  upload(file: File | Blob, path: string): Promise<string>
  download(path: string): Promise<Blob>
  delete(path: string): Promise<void>
  getUrl(path: string): string
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
