import type { StorageProvider, StorageConfig } from "./types"
import { LocalStorageProvider } from "./local"
import { S3StorageProvider } from "./s3"

export type { StorageProvider }

let storageInstance: StorageProvider | null = null

function createStorage(config: StorageConfig): StorageProvider {
  if (config.provider === "s3" && config.s3) {
    return new S3StorageProvider(config.s3)
  }

  if (config.provider === "local" && config.local) {
    return new LocalStorageProvider(config.local)
  }

  throw new Error(`Invalid storage configuration: provider=${config.provider}`)
}

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const provider = process.env.STORAGE_PROVIDER as "local" | "s3" | undefined

    if (provider === "s3") {
      storageInstance = createStorage({
        provider: "s3",
        s3: {
          bucket: process.env.S3_BUCKET!,
          region: process.env.S3_REGION || "us-east-1",
          endpoint: process.env.S3_ENDPOINT,
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      })
    } else {
      storageInstance = createStorage({
        provider: "local",
        local: {
          basePath: process.env.STORAGE_PATH || "./uploads",
          baseUrl: process.env.STORAGE_URL || "/uploads",
        },
      })
    }
  }

  return storageInstance
}

export function generateStoragePath(
  type: "beans" | "gear" | "places" | "shots" | "cafe-visits",
  id: number,
  filename: string
): string {
  const ext = filename.split(".").pop() || "jpg"
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${type}/${id}/${timestamp}-${randomSuffix}.${ext}`
}
