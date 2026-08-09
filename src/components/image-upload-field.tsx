import { useState, type DragEvent, type ReactNode, type RefObject } from "react"
import { Clipboard, Download, ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ImageFile } from "@/hooks/useImageUpload"
import { cn } from "@/lib/utils"

interface ImageUploadFieldProps {
  readonly images: readonly ImageFile[]
  readonly fileInputRef: RefObject<HTMLInputElement | null>
  readonly onFilesAdded: (files: readonly File[]) => Promise<readonly ImageFile[]>
  readonly onImportFromUrl: (url: string) => Promise<ImageFile>
  readonly onPasteFromClipboard: () => Promise<readonly ImageFile[]>
  readonly onRemoveImage: (index: number) => void
  readonly onOpenFilePicker: () => void
  readonly prompt: string
  readonly previewAltPrefix: string
  readonly isBusy?: boolean
  readonly statusText?: string
  readonly helperText?: ReactNode
  readonly footer?: ReactNode
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not add that picture"
}

export function ImageUploadField({
  images,
  fileInputRef,
  onFilesAdded,
  onImportFromUrl,
  onPasteFromClipboard,
  onRemoveImage,
  onOpenFilePicker,
  prompt,
  previewAltPrefix,
  isBusy = false,
  statusText,
  helperText,
  footer,
}: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const intakeBusy = isBusy || isImporting

  const addFiles = async (files: readonly File[]) => {
    try {
      await onFilesAdded(files)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void addFiles(Array.from(event.dataTransfer.files))
  }

  const handleUrlImport = async () => {
    if (!imageUrl.trim()) return
    setIsImporting(true)
    try {
      await onImportFromUrl(imageUrl.trim())
      setImageUrl("")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4" aria-busy={intakeBusy}>
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={image.preview} className="group relative">
              <img
                src={image.preview}
                alt={`${previewAltPrefix} picture ${index + 1}`}
                width={320}
                height={320}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-foreground/80 text-background opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:size-8 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                aria-label={`Remove ${previewAltPrefix.toLowerCase()} picture ${index + 1}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={intakeBusy}
        onClick={onOpenFilePicker}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData.files)
          if (!intakeBusy && files.length > 0) {
            event.preventDefault()
            void addFiles(files)
          }
        }}
        className={cn(
          "w-full cursor-pointer rounded-lg border-2 border-dashed border-border bg-secondary/35 p-6 text-center transition-colors hover:border-primary/60 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:p-8",
          isDragging && "border-primary bg-primary/10",
        )}
      >
        <ImagePlus className="mx-auto size-8 text-primary" />
        <p className="mt-2 text-sm font-semibold text-foreground">{prompt}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drop pictures here, choose from your device, or paste while focused
        </p>
        {helperText ? <div className="mt-2 text-xs text-muted-foreground">{helperText}</div> : null}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={intakeBusy}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) void addFiles(files)
        }}
        className="sr-only"
        tabIndex={-1}
      />

      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={intakeBusy}
          onClick={async () => {
            try {
              await onPasteFromClipboard()
            } catch (error) {
              toast.error(errorMessage(error))
            }
          }}
        >
          <Clipboard className="size-4" />
          Paste picture
        </Button>

        <div className="flex min-w-0 gap-2" role="group" aria-label="Add picture from URL">
          <Input
            type="url"
            inputMode="url"
            aria-label="Picture URL"
            placeholder="https://example.com/picture.jpg"
            value={imageUrl}
            disabled={intakeBusy}
            onChange={(event) => setImageUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleUrlImport()
              }
            }}
            className="min-h-11 min-w-0"
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 shrink-0"
            disabled={intakeBusy || !imageUrl.trim()}
            onClick={() => void handleUrlImport()}
          >
            {isImporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Add URL
          </Button>
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {statusText ?? (isImporting
          ? "Downloading picture"
          : `${images.length} ${images.length === 1 ? "picture" : "pictures"} ready`)}
      </div>
      {footer}
    </div>
  )
}
