import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { basename } from "node:path"
import { createServerFn } from "@tanstack/react-start"

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_REDIRECTS = 4
const REQUEST_TIMEOUT_MS = 15_000
const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
])

class RemoteImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RemoteImageError"
  }
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number)
  const first = octets[0]
  const second = octets[1]
  if (first === undefined || second === undefined) return true

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  )
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase()
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized)
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.slice("::ffff:".length))
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  )
}

async function assertPublicImageUrl(value: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new RemoteImageError("Enter a valid image URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RemoteImageError("Image URLs must use HTTP or HTTPS")
  }
  if (url.username || url.password) {
    throw new RemoteImageError("Image URLs cannot contain credentials")
  }

  const addresses = await lookup(url.hostname, { all: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new RemoteImageError("That image host is not allowed")
  }
  return url
}

async function readLimitedBody(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new RemoteImageError("The image must be smaller than 10 MB")
  }
  if (!response.body) throw new RemoteImageError("The image response was empty")

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const result = await reader.read()
    if (result.done) break
    totalBytes += result.value.byteLength
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel()
      throw new RemoteImageError("The image must be smaller than 10 MB")
    }
    chunks.push(result.value)
  }
  return Buffer.concat(chunks)
}

async function downloadImage(value: string) {
  let url = await assertPublicImageUrl(value)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new RemoteImageError("The image URL redirected too many times")
      }
      url = await assertPublicImageUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) {
      throw new RemoteImageError(`The image server returned ${response.status}`)
    }

    const mimeType = response.headers.get("content-type")?.split(";", 1)[0]?.trim()
    if (!mimeType || !IMAGE_MIME_TYPES.has(mimeType)) {
      throw new RemoteImageError("The URL must point directly to a supported image")
    }

    const content = await readLimitedBody(response)
    const pathName = basename(decodeURIComponent(url.pathname))
    const filename = pathName?.includes(".") ? pathName : `picture.${mimeType.split("/")[1]}`
    return {
      base64: content.toString("base64"),
      filename,
      mimeType,
      sizeBytes: content.byteLength,
    }
  }

  throw new RemoteImageError("Could not download the image")
}

export const downloadRemoteImage = createServerFn({ method: "POST" })
  .validator((data: { url: string }) => data)
  .handler(async ({ data }) => downloadImage(data.url))
