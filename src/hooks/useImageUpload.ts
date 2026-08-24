import { useCallback, useEffect, useRef, useState } from 'react'
import { IMAGE_MIME_TYPE_VALUES, MAX_IMAGE_BYTES } from '@/lib/domain-contracts'
import { downloadRemoteImage } from '@/lib/server/remote-image'

const IMAGE_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPE_VALUES)
const CLIENT_IMAGE_MAX_DIMENSION = 1_600
const CLIENT_IMAGE_QUALITY = 0.8
const CLIENT_IMAGE_COMPRESSION_THRESHOLD = 2 * 1024 * 1024
const IMAGE_MIME_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  avif: 'image/avif',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export interface ImageFile {
  readonly file: File
  readonly preview: string
  readonly base64: string
}

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageUploadError'
  }
}

function normalizeImageType(file: File): File | null {
  if (IMAGE_MIME_TYPES.has(file.type.toLowerCase())) return file

  const extension = file.name.split('.').pop()?.toLowerCase()
  const inferredType = extension
    ? IMAGE_MIME_TYPE_BY_EXTENSION[extension]
    : undefined
  if (!inferredType) return null

  return new File([file], file.name, {
    type: inferredType,
    lastModified: file.lastModified,
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function compressLargeImage(file: File): Promise<File> {
  if (file.size < CLIENT_IMAGE_COMPRESSION_THRESHOLD) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    })
    const scale = Math.min(
      1,
      CLIENT_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await canvasToBlob(canvas, 'image/webp', CLIENT_IMAGE_QUALITY)
    if (!blob || blob.size >= file.size) return file

    const basename = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${basename}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified,
    })
  } catch {
    // Some browsers cannot decode every image they can select (notably HEIC).
    // The original still goes through the normal size and format validation.
    return file
  }
}

async function prepareImageFiles(
  files: readonly File[],
): Promise<readonly File[]> {
  if (files.length === 0) return validateImageFiles(files)

  const normalizedFiles = files.map((file) => {
    const imageFile = normalizeImageType(file)
    if (!imageFile) {
      throw new ImageUploadError(
        `${file.name || 'That file'} is not a supported image. Use JPG, PNG, WebP, HEIC/HEIF, GIF or AVIF.`,
      )
    }
    if (imageFile.size === 0) {
      throw new ImageUploadError(`${imageFile.name} is empty`)
    }
    return imageFile
  })

  return validateImageFiles(
    await Promise.all(normalizedFiles.map(compressLargeImage)),
  )
}

export function validateImageFiles(files: readonly File[]): readonly File[] {
  if (files.length === 0) {
    throw new ImageUploadError('Choose, drop, or paste an image to continue')
  }

  const normalizedFiles: File[] = []
  for (const file of files) {
    const imageFile = normalizeImageType(file)
    if (!imageFile) {
      throw new ImageUploadError(
        `${file.name || 'That file'} is not a supported image. Use JPG, PNG, WebP, HEIC/HEIF, GIF or AVIF.`,
      )
    }
    if (imageFile.size === 0) {
      throw new ImageUploadError(`${imageFile.name} is empty`)
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      throw new ImageUploadError(
        `${imageFile.name} is larger than the 10 MB limit`,
      )
    }
    normalizedFiles.push(imageFile)
  }

  return normalizedFiles
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(new ImageUploadError(`Could not read ${file.name}`))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new ImageUploadError(`Could not read ${file.name}`))
        return
      }
      const separator = reader.result.indexOf(',')
      if (separator === -1) {
        reject(new ImageUploadError(`Could not read ${file.name}`))
        return
      }
      resolve(reader.result.slice(separator + 1))
    }
    reader.readAsDataURL(file)
  })
}

function decodeBase64File(
  base64: string,
  filename: string,
  mimeType: string,
): File {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], filename, { type: mimeType })
}

export function useImageUpload() {
  const [images, setImages] = useState<readonly ImageFile[]>([])
  const imagesRef = useRef<readonly ImageFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(
    () => () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.preview)
    },
    [],
  )

  const addFiles = useCallback(async (files: readonly File[]) => {
    const imageFiles = await prepareImageFiles(files)

    const encodedImages = await Promise.all(
      imageFiles.map(async (file) => {
        const base64 = await readFileAsBase64(file)
        return { file, base64 }
      }),
    )
    const newImages = encodedImages.map(({ file, base64 }) => ({
      file,
      preview: URL.createObjectURL(file),
      base64,
    }))
    setImages((current) => [...current, ...newImages])
    if (fileInputRef.current) fileInputRef.current.value = ''
    return newImages
  }, [])

  const importFromUrl = useCallback(async (url: string) => {
    const remoteImage = await downloadRemoteImage({ data: { url } })
    const file = decodeBase64File(
      remoteImage.base64,
      remoteImage.filename,
      remoteImage.mimeType,
    )
    const preview = URL.createObjectURL(file)
    const image = { file, preview, base64: remoteImage.base64 }
    setImages((current) => [...current, image])
    return image
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages((current) => {
      const image = current[index]
      if (!image) return current
      URL.revokeObjectURL(image.preview)
      return current.filter((_, imageIndex) => imageIndex !== index)
    })
  }, [])

  const clearImages = useCallback(() => {
    setImages((current) => {
      for (const image of current) URL.revokeObjectURL(image.preview)
      return []
    })
  }, [])

  const removeImages = useCallback((removedImages: readonly ImageFile[]) => {
    const removedPreviews = new Set(removedImages.map((image) => image.preview))
    setImages((current) => {
      for (const image of current) {
        if (removedPreviews.has(image.preview))
          URL.revokeObjectURL(image.preview)
      }
      return current.filter((image) => !removedPreviews.has(image.preview))
    })
  }, [])

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), [])

  return {
    images,
    fileInputRef,
    addFiles,
    importFromUrl,
    removeImage,
    removeImages,
    clearImages,
    openFilePicker,
  }
}
