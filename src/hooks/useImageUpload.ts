import { useState, useRef, useCallback } from "react"

export interface ImageFile {
  file: File
  preview: string
  base64: string
}

export function useImageUpload() {
  const [images, setImages] = useState<ImageFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const newImages: ImageFile[] = []

      for (const file of files) {
        if (!file.type.startsWith("image/")) continue

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(",")[1])
          }
          reader.readAsDataURL(file)
        })

        newImages.push({
          file,
          preview: URL.createObjectURL(file),
          base64,
        })
      }

      setImages((prev) => [...prev, ...newImages])
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    []
  )

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }, [])

  const clearImages = useCallback(() => {
    for (const image of images) {
      URL.revokeObjectURL(image.preview)
    }
    setImages([])
  }, [images])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return {
    images,
    fileInputRef,
    handleImageSelect,
    removeImage,
    clearImages,
    openFilePicker,
  }
}
