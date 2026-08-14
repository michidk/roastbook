import { createServerOnlyFn } from '@tanstack/react-start'
import { getServerEnv, type ServerEnv } from '@/lib/env.server'
import { LocalStorageProvider } from './local'
import { S3StorageProvider } from './s3'
import type { StorageConfig, StorageProvider } from './types'

export type { StorageProvider }

let storageInstance: StorageProvider | null = null

function requireS3Value(
  environment: ServerEnv,
  name: 'S3_BUCKET' | 'S3_ACCESS_KEY_ID' | 'S3_SECRET_ACCESS_KEY',
): string {
  const value = environment[name]
  if (!value) {
    throw new Error(`Invalid environment configuration: ${name} is required`)
  }
  return value
}

function createStorage(config: StorageConfig): StorageProvider {
  if (config.provider === 's3' && config.s3) {
    return new S3StorageProvider(config.s3)
  }

  if (config.provider === 'local' && config.local) {
    return new LocalStorageProvider(config.local)
  }

  throw new Error(`Invalid storage configuration: provider=${config.provider}`)
}

export const getStorage = createServerOnlyFn((): StorageProvider => {
  if (!storageInstance) {
    const environment = getServerEnv()

    if (environment.STORAGE_PROVIDER === 's3') {
      storageInstance = createStorage({
        provider: 's3',
        s3: {
          bucket: requireS3Value(environment, 'S3_BUCKET'),
          region: environment.S3_REGION,
          endpoint: environment.S3_ENDPOINT,
          accessKeyId: requireS3Value(environment, 'S3_ACCESS_KEY_ID'),
          secretAccessKey: requireS3Value(environment, 'S3_SECRET_ACCESS_KEY'),
        },
      })
    } else {
      storageInstance = createStorage({
        provider: 'local',
        local: {
          basePath: environment.STORAGE_PATH,
          baseUrl: environment.STORAGE_URL,
        },
      })
    }
  }

  return storageInstance
})

export function generateStoragePath(
  type: 'beans' | 'gear' | 'coffee-shops' | 'shots' | 'cafe-visits',
  id: number,
  filename: string,
): string {
  const ext = filename.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${type}/${id}/${timestamp}-${randomSuffix}.${ext}`
}
