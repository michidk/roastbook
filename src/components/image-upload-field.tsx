import type { ChangeEvent, ReactNode, RefObject } from "react"
import { ImagePlus, X } from "lucide-react"
import type { ImageFile } from "@/hooks/useImageUpload"

interface ImageUploadFieldProps {
  images: ImageFile[]
  fileInputRef: RefObject<HTMLInputElement | null>
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (index: number) => void
  onOpenFilePicker: () => void
  prompt: string
  previewAltPrefix: string
  helperText?: ReactNode
  footer?: ReactNode
}

export function ImageUploadField({
  images,
  fileInputRef,
  onImageSelect,
  onRemoveImage,
  onOpenFilePicker,
  prompt,
  previewAltPrefix,
  helperText,
  footer,
}: ImageUploadFieldProps) {
  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={image.preview} className="group relative">
              <img
                src={image.preview}
                alt={`${previewAltPrefix} image ${index + 1}`}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove ${previewAltPrefix.toLowerCase()} image ${index + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={onOpenFilePicker}
        className="cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
      >
        <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{prompt}</p>
        {helperText ? <div className="mt-1 text-xs text-muted-foreground">{helperText}</div> : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onImageSelect}
        className="hidden"
      />

      {footer}
    </div>
  )
}
