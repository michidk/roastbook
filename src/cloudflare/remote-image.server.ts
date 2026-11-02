import { IMAGE_MIME_TYPE_VALUES } from '@/lib/domain-contracts'
import {
  type ResolvedAddress,
  type ResolveHost,
  resolvePublicHttpUrl,
} from '@/lib/server/remote-url-policy.server'
import { MAX_IMAGE_BYTES } from '@/lib/server-validation'
import { fetchPublicResource } from './public-fetch.server'

const MAX_REDIRECTS = 4
const REQUEST_TIMEOUT_MS = 15_000
const IMAGE_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPE_VALUES)
const IMAGE_EXTENSION_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

class RemoteImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RemoteImageError'
  }
}

type RequestPinnedUrl = (
  url: URL,
  addresses: readonly ResolvedAddress[],
  signal: AbortSignal,
) => Promise<Response>

const requestPinnedUrl: RequestPinnedUrl = (url, _addresses, signal) =>
  fetchPublicResource(url, {
    signal,
    headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif' },
    method: 'GET',
  })

export function remoteImageFilename(url: URL, mimeType: string): string {
  let decodedPath = url.pathname
  try {
    decodedPath = decodeURIComponent(url.pathname)
  } catch {
    // Keep the URL-encoded path when a remote server uses malformed escapes.
  }

  const pathName = decodedPath.split('/').filter(Boolean).at(-1) ?? ''
  const extension = IMAGE_EXTENSION_BY_MIME_TYPE[mimeType]
  if (!extension) return 'picture'

  const stem = pathName.replace(/\.[^.]*$/, '') || 'picture'
  const filename = `${stem}.${extension}`
  return filename.length <= 255 ? filename : `picture.${extension}`
}

async function readLimitedBody(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    await response.body?.cancel()
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

export async function downloadImage(
  value: string,
  {
    resolveHost,
    request = requestPinnedUrl,
  }: { resolveHost?: ResolveHost; request?: RequestPinnedUrl } = {},
) {
  let resolved = await resolvePublicHttpUrl(value, resolveHost)

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await request(resolved.url, resolved.addresses, signal)
    } catch {
      if (signal.aborted) {
        throw new RemoteImageError('The image request timed out')
      }
      throw new RemoteImageError('Could not download the image')
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new RemoteImageError('The image URL redirected too many times')
      }
      await response.body?.cancel()
      resolved = await resolvePublicHttpUrl(
        new URL(location, resolved.url).toString(),
        resolveHost,
      )
      continue
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new RemoteImageError(`The image server returned ${response.status}`)
    }

    const mimeType = response.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase()
    if (!mimeType || !IMAGE_MIME_TYPES.has(mimeType)) {
      await response.body?.cancel()
      throw new RemoteImageError(
        'The URL must point directly to a supported image',
      )
    }

    const content = await readLimitedBody(response)
    return {
      base64: content.toString('base64'),
      filename: remoteImageFilename(resolved.url, mimeType),
      mimeType,
      sizeBytes: content.byteLength,
    }
  }

  throw new RemoteImageError('Could not download the image')
}
