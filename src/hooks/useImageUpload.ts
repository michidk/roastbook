import { useCallback, useEffect, useRef, useState } from "react"
import { downloadRemoteImage } from "@/lib/server/remote-image"

export interface ImageFile {
  readonly file: File
  readonly preview: string
  readonly base64: string
}

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImageUploadError"
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new ImageUploadError(`Could not read ${file.name}`))
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new ImageUploadError(`Could not read ${file.name}`))
        return
      }
      const separator = reader.result.indexOf(",")
      if (separator === -1) {
        reject(new ImageUploadError(`Could not read ${file.name}`))
        return
      }
      resolve(reader.result.slice(separator + 1))
    }
    reader.readAsDataURL(file)
  })
}

function decodeBase64File(base64: string, filename: string, mimeType: string): File {
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
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))
    if (imageFiles.length === 0) {
      throw new ImageUploadError("Choose or paste a supported image file")
    }

    const newImages = await Promise.all(
      imageFiles.map(async (file) => ({
        file,
        preview: URL.createObjectURL(file),
        base64: await readFileAsBase64(file),
      })),
    )
    setImages((current) => [...current, ...newImages])
    if (fileInputRef.current) fileInputRef.current.value = ""
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

  const pasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.read) {
      throw new ImageUploadError("Clipboard pictures are not supported by this browser")
    }

    const clipboardItems = await navigator.clipboard.read()
    const files: File[] = []
    for (const item of clipboardItems) {
      const imageType = item.types.find((type) => type.startsWith("image/"))
      if (!imageType) continue
      const blob = await item.getType(imageType)
      files.push(new File([blob], `clipboard-${Date.now()}.${imageType.split("/")[1]}`, {
        type: imageType,
      }))
    }
    return addFiles(files)
  }, [addFiles])

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

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), [])

  return {
    images,
    fileInputRef,
    addFiles,
    importFromUrl,
    pasteFromClipboard,
    removeImage,
    clearImages,
    openFilePicker,
  }
}
