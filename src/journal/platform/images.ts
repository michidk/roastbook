// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import * as images from '@/lib/thumbnail-image'

const buffer = (bytes: Uint8Array) =>
  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)

export const validateImageBuffer = (bytes: Uint8Array, mimeType: string) =>
  images.validateImageBuffer(buffer(bytes), mimeType)
export const createStoredImage = (bytes: Uint8Array) =>
  images.createStoredImage(buffer(bytes))
export const createThumbnail = (bytes: Uint8Array) =>
  images.createThumbnail(buffer(bytes))
export const createSmallThumbnail = (bytes: Uint8Array) =>
  images.createSmallThumbnail(buffer(bytes))
