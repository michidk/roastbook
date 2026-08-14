import { basename } from 'node:path'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { IMAGE_MIME_TYPE_VALUES } from '@/lib/domain-contracts'
import { assertPublicHttpUrl } from '@/lib/server/remote-url-policy.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import { MAX_IMAGE_BYTES } from '@/lib/server-validation'

const MAX_REDIRECTS = 4
const REQUEST_TIMEOUT_MS = 15_000
const IMAGE_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPE_VALUES)

class RemoteImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RemoteImageError'
  }
}

async function readLimitedBody(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new RemoteImageError('The image must be smaller than 10 MB')
  }
  if (!response.body) throw new RemoteImageError('The image response was empty')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const result = await reader.read()
    if (result.done) break
    totalBytes += result.value.byteLength
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel()
      throw new RemoteImageError('The image must be smaller than 10 MB')
    }
    chunks.push(result.value)
  }
  return Buffer.concat(chunks)
}

async function downloadImage(value: string) {
  let url = await assertPublicHttpUrl(value)

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    let response: Response
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif',
        },
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new RemoteImageError('The image request timed out')
      }
      throw new RemoteImageError('Could not download the image')
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new RemoteImageError('The image URL redirected too many times')
      }
      url = await assertPublicHttpUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) {
      throw new RemoteImageError(`The image server returned ${response.status}`)
    }

    const mimeType = response.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase()
    if (!mimeType || !IMAGE_MIME_TYPES.has(mimeType)) {
      throw new RemoteImageError(
        'The URL must point directly to a supported image',
      )
    }

    const content = await readLimitedBody(response)
    let decodedPath = url.pathname
    try {
      decodedPath = decodeURIComponent(url.pathname)
    } catch {
      // Keep the URL-encoded path when a remote server uses malformed escapes.
    }
    const pathName = basename(decodedPath)
    const filename =
      pathName.includes('.') && pathName.length <= 255
        ? pathName
        : `picture.${mimeType.split('/')[1]}`
    return {
      base64: content.toString('base64'),
      filename,
      mimeType,
      sizeBytes: content.byteLength,
    }
  }

  throw new RemoteImageError('Could not download the image')
}

export const downloadRemoteImage = createServerFn({ method: 'POST' })
  .validator(z.object({ url: z.url().max(2_048) }))
  .handler(async ({ data }) =>
    withResourceLimits('remote-image-download', () => downloadImage(data.url)),
  )
