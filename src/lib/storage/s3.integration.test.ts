import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { S3StorageProvider } from './s3'

const endpoint = process.env.TEST_S3_ENDPOINT
const accessKeyId = process.env.TEST_S3_ACCESS_KEY_ID
const secretAccessKey = process.env.TEST_S3_SECRET_ACCESS_KEY
const bucket = process.env.TEST_S3_BUCKET ?? 'roastbook-test'
const hasS3TestConfig = Boolean(endpoint && accessKeyId && secretAccessKey)
const s3Describe = hasS3TestConfig ? describe : describe.skip

const config = {
  bucket,
  region: 'us-east-1',
  endpoint,
  accessKeyId: accessKeyId ?? '',
  secretAccessKey: secretAccessKey ?? '',
}

const client = hasS3TestConfig
  ? new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  : undefined
const provider = hasS3TestConfig ? new S3StorageProvider(config) : undefined

beforeAll(async () => {
  await client?.send(new CreateBucketCommand({ Bucket: bucket }))
})

afterAll(async () => {
  await client?.send(new DeleteBucketCommand({ Bucket: bucket }))
  client?.destroy()
})

s3Describe('S3StorageProvider', () => {
  test('uploads, downloads, lists, checks, and deletes an object', async () => {
    if (!provider) throw new Error('S3 test provider is unavailable')
    const storagePath = 'beans/42/photo.txt'

    await provider.upload(
      new Blob(['coffee'], { type: 'text/plain' }),
      storagePath,
    )

    expect(await provider.exists(storagePath)).toBe(true)
    expect(await provider.list()).toEqual([storagePath])
    expect(await provider.list('beans/42')).toEqual([storagePath])
    expect(await (await provider.download(storagePath)).text()).toBe('coffee')

    await provider.delete(storagePath)
    expect(await provider.exists(storagePath)).toBe(false)
  })
})
