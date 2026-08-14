import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  paginateListObjectsV2,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { StorageConfig, StorageProvider, StoredObject } from './types'

export class S3StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string

  constructor(config: NonNullable<StorageConfig['s3']>) {
    this.bucket = config.bucket
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: !!config.endpoint,
    })
  }

  async upload(file: File | Blob, path: string): Promise<string> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: path,
        Body: file.stream(),
        ContentType: file.type || 'application/octet-stream',
      },
    })

    await upload.done()
    return path
  }

  async download(path: string): Promise<Blob> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    })

    const response = await this.client.send(command)
    const stream = response.Body as ReadableStream
    return new Blob([await new Response(stream).arrayBuffer()], {
      type: response.ContentType,
    })
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    })

    await this.client.send(command)
  }

  getUrl(path: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${path}`
  }

  async exists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      })
      await this.client.send(command)
      return true
    } catch {
      return false
    }
  }

  async list(prefix?: string): Promise<string[]> {
    return (await this.listObjects(prefix)).map(({ path }) => path)
  }

  async listObjects(prefix?: string): Promise<StoredObject[]> {
    const objects: StoredObject[] = []
    const pages = paginateListObjectsV2(
      { client: this.client },
      { Bucket: this.bucket, Prefix: prefix },
    )

    for await (const page of pages) {
      for (const object of page.Contents ?? []) {
        if (!object.Key) continue
        objects.push({
          path: object.Key,
          sizeBytes: object.Size ?? 0,
        })
      }
    }

    return objects
  }
}
