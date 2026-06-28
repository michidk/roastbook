import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import type { StorageProvider, StorageConfig } from "./types"

export class S3StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string

  constructor(config: NonNullable<StorageConfig["s3"]>) {
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
        ContentType: file.type || "application/octet-stream",
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
}
