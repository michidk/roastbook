import { useCallback, useEffect, useRef, useState } from 'react'
import { getImageUploadPolicy } from '@/journal/images'
import { decodeBase64 } from '@/lib/base64'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  type PreparedPicture,
  preparePicture,
} from '@/lib/client/image-compression'
import { isConnectionOnline } from '@/lib/connection-status'
import { IMAGE_MIME_TYPE_VALUES, MAX_IMAGE_BYTES } from '@/lib/domain-contracts'
import type { ImageFile } from '@/lib/image-file'
import { convertPicture } from '@/lib/server/pictures'
import { downloadRemoteImage } from '@/lib/server/remote-image'

const IMAGE_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPE_VALUES)
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

/**
 * Encodes each picture once, in the sizes the journal stores. A picture this
 * browser cannot decode (HEIC outside Safari) is encoded by the server.
 */
async function preparePictureFile(file: File): Promise<PreparedPicture> {
  const prepared = await preparePicture(file)
  if (prepared) return prepared
  if (DEMO_MODE || !isConnectionOnline())
    throw new ImageUploadError(
      `This browser cannot read ${file.name}. Connect to the internet to convert it, or choose a JPEG, PNG or WebP picture.`,
    )
  const data = new FormData()
  data.set('file', file, file.name)
  const converted = await convertPicture({ data })
  const name = file.name.replace(/\.[^.]+$/, '') || 'picture'
  const webp = (base64: string, suffix: string) =>
    new File([decodeBase64(base64) as BlobPart], `${name}${suffix}.webp`, {
      type: 'image/webp',
    })
  return {
    file: webp(converted.stored, ''),
    thumbnail: webp(converted.thumbnail, '.thumb'),
    small: webp(converted.small, '.small'),
  }
}

async function prepareImageFiles(
  files: readonly File[],
): Promise<readonly PreparedPicture[]> {
  const imageFiles = validateImageFiles(files)
  const prepared: PreparedPicture[] = []
  // One at a time: each decoded photo holds tens of megabytes.
  for (const file of imageFiles) prepared.push(await preparePictureFile(file))
  return prepared
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

export function useImageUpload({
  existingImageCount = 0,
}: {
  existingImageCount?: number
} = {}) {
  const [maxImages, setMaxImages] = useState(3)
  const processing = useRef(false)
  useEffect(() => {
    let active = true
    void getImageUploadPolicy()
      .then((policy) => {
        if (active) setMaxImages(policy.maxImagesPerItem)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
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

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      if (processing.current)
        throw new ImageUploadError(
          'Pictures are still being prepared. Try again shortly.',
        )
      if (
        existingImageCount + imagesRef.current.length + files.length >
        maxImages
      )
        throw new ImageUploadError(
          `Each item can have at most ${maxImages} pictures. Remove a picture before adding another.`,
        )
      processing.current = true
      try {
        const pictures = await prepareImageFiles(files)
        const newImages = await Promise.all(
          pictures.map(async (picture) => ({
            ...picture,
            preview: URL.createObjectURL(picture.file),
            base64: await readFileAsBase64(picture.file),
          })),
        )
        imagesRef.current = [...imagesRef.current, ...newImages]
        setImages(imagesRef.current)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return newImages
      } finally {
        processing.current = false
      }
    },
    [existingImageCount, maxImages],
  )

  const importFromUrl = useCallback(
    async (url: string) => {
      if (DEMO_MODE)
        throw new ImageUploadError(
          'Remote picture imports are unavailable in the demo. Choose a file from this device.',
        )
      if (existingImageCount + imagesRef.current.length >= maxImages)
        throw new ImageUploadError(
          `Each item can have at most ${maxImages} pictures. Remove a picture before adding another.`,
        )
      const remoteImage = await downloadRemoteImage({ data: { url } })
      const added = await addFiles([
        decodeBase64File(
          remoteImage.base64,
          remoteImage.filename,
          remoteImage.mimeType,
        ),
      ])
      const image = added[0]
      if (!image) throw new ImageUploadError('Could not prepare this picture')
      return image
    },
    [addFiles, existingImageCount, maxImages],
  )

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
    maxImages,
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
