import type { Dirent } from 'node:fs'
import {
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { StorageConfig, StorageProvider, StoredObject } from './types'

export class InvalidStoragePathError extends Error {
  constructor() {
    super('Storage path must stay within the configured storage root')
    this.name = 'InvalidStoragePathError'
  }
}

function decodeStoragePath(path: string): string {
  let decoded = path

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
  } catch {
    throw new InvalidStoragePathError()
  }

  return decoded
}

function hasTraversalSegment(path: string): boolean {
  return path.replaceAll('\\', '/').split('/').includes('..')
}

function isPortableAbsolutePath(path: string): boolean {
  return (
    isAbsolute(path) || /^[a-zA-Z]:[\\/]/.test(path) || path.startsWith('\\\\')
  )
}

function assertSafeStoragePath(path: string): void {
  const decodedPath = decodeStoragePath(path)
  const candidates = [path, decodedPath]

  if (
    !path ||
    path.includes('\0') ||
    candidates.some(isPortableAbsolutePath) ||
    candidates.some(hasTraversalSegment)
  ) {
    throw new InvalidStoragePathError()
  }
}

function isOutsideStorageRoot(basePath: string, fullPath: string): boolean {
  const relativePath = relative(basePath, fullPath)
  return (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  )
}

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string
  private readonly baseUrl: string

  constructor(config: NonNullable<StorageConfig['local']>) {
    this.basePath = resolve(config.basePath)
    this.baseUrl = config.baseUrl
  }

  private resolvePath(path: string): string {
    assertSafeStoragePath(path)

    const fullPath = resolve(this.basePath, path)
    if (isOutsideStorageRoot(this.basePath, fullPath)) {
      throw new InvalidStoragePathError()
    }

    return fullPath
  }

  async upload(file: File | Blob, path: string): Promise<string> {
    const fullPath = this.resolvePath(path)
    await mkdir(dirname(fullPath), { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)

    return path
  }

  async download(path: string): Promise<Blob> {
    const fullPath = this.resolvePath(path)
    const buffer = await readFile(fullPath)
    return new Blob([buffer])
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.resolvePath(path)
    await unlink(fullPath)
  }

  getUrl(path: string): string {
    return `${this.baseUrl}/${path}`
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = this.resolvePath(path)
    try {
      await stat(fullPath)
      return true
    } catch {
      return false
    }
  }

  async list(prefix?: string): Promise<string[]> {
    return (await this.listObjects(prefix)).map(({ path }) => path)
  }

  async listObjects(prefix?: string): Promise<StoredObject[]> {
    const startPath = prefix ? this.resolvePath(prefix) : this.basePath
    const storageRoot = this.basePath
    const objects: StoredObject[] = []

    async function walk(directory: string): Promise<void> {
      let entries: Dirent[]
      try {
        entries = await readdir(directory, { withFileTypes: true })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
        throw error
      }

      for (const entry of entries) {
        const fullPath = resolve(directory, entry.name)
        if (entry.isDirectory()) await walk(fullPath)
        else if (entry.isFile()) {
          const metadata = await stat(fullPath)
          objects.push({
            path: relative(storageRoot, fullPath).replaceAll('\\', '/'),
            sizeBytes: metadata.size,
          })
        }
      }
    }

    await walk(startPath)
    return objects
  }
}
