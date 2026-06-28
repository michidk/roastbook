import { mkdir, unlink, stat, writeFile, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { StorageProvider, StorageConfig } from "./types"

export class LocalStorageProvider implements StorageProvider {
  private basePath: string
  private baseUrl: string

  constructor(config: NonNullable<StorageConfig["local"]>) {
    this.basePath = config.basePath
    this.baseUrl = config.baseUrl
  }

  async upload(file: File | Blob, path: string): Promise<string> {
    const fullPath = join(this.basePath, path)
    await mkdir(dirname(fullPath), { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)

    return path
  }

  async download(path: string): Promise<Blob> {
    const fullPath = join(this.basePath, path)
    const buffer = await readFile(fullPath)
    return new Blob([buffer])
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path)
    await unlink(fullPath)
  }

  getUrl(path: string): string {
    return `${this.baseUrl}/${path}`
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path)
    try {
      await stat(fullPath)
      return true
    } catch {
      return false
    }
  }
}
