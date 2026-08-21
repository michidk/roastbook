import {
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardPaste,
  ImagePlus,
  Link2,
  Loader2,
  RotateCw,
  UploadCloud,
  X,
} from 'lucide-react'
import {
  type DragEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ImageFile } from '@/hooks/useImageUpload'
import { cn } from '@/lib/utils'

interface PictureUploadDialogProps {
  readonly images: readonly ImageFile[]
  readonly fileInputRef: RefObject<HTMLInputElement | null>
  readonly onFilesAdded: (
    files: readonly File[],
  ) => Promise<readonly ImageFile[]>
  readonly onImportFromUrl: (url: string) => Promise<ImageFile>
  readonly onPasteFromClipboard: () => Promise<readonly ImageFile[]>
  readonly onRemoveImage: (index: number) => void
  readonly onOpenFilePicker: () => void
  readonly prompt: string
  readonly previewAltPrefix: string
  readonly uploadMode?: 'immediate' | 'queued'
  readonly isBusy?: boolean
  readonly statusText?: string
  readonly helperText?: ReactNode
  readonly footer?: ReactNode
  readonly imageErrors?: readonly {
    readonly preview: string
    readonly filename: string
    readonly message: string
  }[]
  readonly onRetryImage?: (image: ImageFile) => void | Promise<void>
}

function messageFromValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value
  if (!value || typeof value !== 'object') return null

  if ('message' in value && typeof value.message === 'string') {
    return value.message.trim() || null
  }
  if ('error' in value && typeof value.error === 'string') {
    return value.error.trim() || null
  }
  return null
}

async function errorMessage(error: unknown): Promise<string> {
  const directMessage = messageFromValue(error)
  if (directMessage) return directMessage

  if (error instanceof Response) {
    try {
      const payload: unknown = await error.clone().json()
      const responseMessage = messageFromValue(payload)
      if (responseMessage) return responseMessage
    } catch {
      // Fall through to the response status when there is no JSON error body.
    }

    if (error.statusText) {
      return `${error.status} ${error.statusText}`
    }
  }

  return 'Could not add that picture'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PictureUploadDialog({
  images,
  fileInputRef,
  onFilesAdded,
  onImportFromUrl,
  onPasteFromClipboard,
  onRemoveImage,
  onOpenFilePicker,
  prompt,
  previewAltPrefix,
  uploadMode = 'queued',
  isBusy = false,
  statusText,
  helperText,
  footer,
  imageErrors = [],
  onRetryImage,
}: PictureUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isAwaitingPaste, setIsAwaitingPaste] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [intakeError, setIntakeError] = useState<string | null>(null)
  const dropzoneRef = useRef<HTMLButtonElement>(null)
  const intakeBusy = isBusy || isImporting

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      setIntakeError(null)
      try {
        await onFilesAdded(files)
      } catch (error) {
        setIntakeError(await errorMessage(error))
      }
    },
    [onFilesAdded],
  )

  useEffect(() => {
    if (!open) return

    const handleWindowPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (intakeBusy || files.length === 0) return
      event.preventDefault()
      setIsAwaitingPaste(false)
      void addFiles(files)
    }

    window.addEventListener('paste', handleWindowPaste)
    return () => window.removeEventListener('paste', handleWindowPaste)
  }, [addFiles, intakeBusy, open])

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (!intakeBusy) void addFiles(Array.from(event.dataTransfer.files))
  }

  const handlePaste = (event: ReactClipboardEvent<HTMLButtonElement>) => {
    const files = Array.from(event.clipboardData.files)
    if (intakeBusy || files.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    setIsAwaitingPaste(false)
    void addFiles(files)
  }

  const promptForKeyboardPaste = () => {
    setIntakeError(null)
    setIsAwaitingPaste(true)
    dropzoneRef.current?.focus()
  }

  const handleClipboardButton = async () => {
    if (!navigator.clipboard?.read) {
      promptForKeyboardPaste()
      return
    }

    setIntakeError(null)
    try {
      await onPasteFromClipboard()
      setIsAwaitingPaste(false)
    } catch (error) {
      setIsAwaitingPaste(true)
      setIntakeError(await errorMessage(error))
      dropzoneRef.current?.focus()
    }
  }

  const handleUrlImport = async () => {
    const url = imageUrl.trim()
    if (!url) return
    setIntakeError(null)
    setIsImporting(true)
    try {
      await onImportFromUrl(url)
      setImageUrl('')
    } catch (error) {
      setIntakeError(await errorMessage(error))
    } finally {
      setIsImporting(false)
    }
  }

  const errorByPreview = new Map(
    imageErrors.map((error) => [error.preview, error]),
  )
  const attentionMessage = `${imageErrors.length} ${
    imageErrors.length === 1 ? 'picture needs' : 'pictures need'
  } attention. Open the uploader to retry.`
  const readyLabel = `${images.length} ${
    images.length === 1 ? 'picture' : 'pictures'
  } added`

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setIsDragging(false)
      setIsAwaitingPaste(false)
      setIntakeError(null)
      setUrlOpen(false)
    }
  }

  return (
    <div className="space-y-3" aria-busy={intakeBusy}>
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image, index) => {
            const imageError = errorByPreview.get(image.preview)
            return (
              <li
                key={image.preview}
                className={cn(
                  'group relative overflow-hidden rounded-xl border border-border bg-muted',
                  imageError && 'border-destructive',
                )}
              >
                <img
                  src={image.preview}
                  alt={`${previewAltPrefix} ${index + 1}`}
                  width={160}
                  height={160}
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  disabled={intakeBusy}
                  className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-full border border-white/30 bg-foreground/80 text-background shadow-sm backdrop-blur-sm transition-colors hover:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [@media(hover:hover)_and_(pointer:fine)]:size-8"
                  aria-label={`Remove ${previewAltPrefix.toLowerCase()} picture ${index + 1}`}
                >
                  <X className="size-4" />
                </button>
                {imageError ? (
                  <span className="absolute bottom-1 left-1 flex size-7 items-center justify-center rounded-full bg-destructive text-white shadow-sm">
                    <CircleAlert className="size-4" />
                    <span className="sr-only">Upload failed</span>
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button type="button" variant="outline" disabled={intakeBusy} />
          }
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Add pictures
        </DialogTrigger>

        <DialogContent
          className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Add pictures</DialogTitle>
            <DialogDescription>
              {prompt}. JPG, PNG, WebP or HEIC, up to 10 MB each.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {intakeError ? (
              <div
                className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-destructive-text"
                role="alert"
              >
                <CircleAlert className="mt-0.5 size-5 shrink-0" />
                <p className="min-w-0 flex-1 text-sm font-semibold">
                  {intakeError}
                </p>
                <button
                  type="button"
                  onClick={() => setIntakeError(null)}
                  className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Dismiss error"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : null}

            <button
              ref={dropzoneRef}
              type="button"
              disabled={intakeBusy}
              onClick={onOpenFilePicker}
              onDragEnter={(event) => {
                event.preventDefault()
                if (!intakeBusy) setIsDragging(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setIsDragging(false)
                }
              }}
              onDrop={handleDrop}
              onPaste={handlePaste}
              className={cn(
                'flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-secondary/35 px-5 py-5 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60',
                isDragging && 'border-primary bg-primary/10',
                isAwaitingPaste && 'border-primary bg-primary/10',
              )}
            >
              {intakeBusy ? (
                <Loader2 className="size-6 animate-spin text-link" />
              ) : (
                <UploadCloud className="size-6 text-link" />
              )}
              <span className="mt-2 font-display text-base font-bold">
                {isDragging
                  ? 'Drop pictures here'
                  : isAwaitingPaste
                    ? 'Paste your picture now'
                    : 'Choose pictures'}
              </span>
              <span className="mt-0.5 text-sm text-muted-foreground">
                {isAwaitingPaste
                  ? 'Press Ctrl+V or Cmd+V'
                  : 'or drop them here'}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={intakeBusy}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                if (files.length > 0) void addFiles(files)
              }}
              className="sr-only"
              tabIndex={-1}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              disabled={intakeBusy}
              onClick={() => void handleClipboardButton()}
            >
              <ClipboardPaste className="size-4" />
              {isAwaitingPaste ? 'Waiting for a pasted picture…' : 'Paste'}
            </Button>

            <Collapsible
              open={urlOpen}
              onOpenChange={setUrlOpen}
              className="space-y-3"
            >
              <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-2 rounded-full px-3 text-left font-display text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Link2 className="size-4" />
                Add from URL
                <ChevronDown className="ml-auto size-4 transition-transform group-data-open:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none">
                <div className="space-y-2 rounded-xl border border-border bg-secondary/35 p-3">
                  <label
                    htmlFor="picture-upload-url"
                    className="text-sm font-semibold"
                  >
                    Picture URL
                  </label>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <Input
                      id="picture-upload-url"
                      type="url"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="https://example.com/picture.jpg"
                      value={imageUrl}
                      disabled={intakeBusy}
                      onChange={(event) => setImageUrl(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleUrlImport()
                        }
                      }}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={intakeBusy || !imageUrl.trim()}
                      onClick={() => void handleUrlImport()}
                    >
                      {isImporting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Link2 className="size-4" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {images.length > 0 ? (
              <ul className="space-y-2" aria-label="Pictures to add">
                {images.map((image, index) => {
                  const imageError = errorByPreview.get(image.preview)
                  const isWorking = isBusy && !imageError
                  return (
                    <li
                      key={image.preview}
                      className={cn(
                        'grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-xl border border-border p-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center',
                        imageError && 'border-destructive/60 bg-destructive/5',
                      )}
                    >
                      <img
                        src={image.preview}
                        alt={`${previewAltPrefix} ${index + 1}`}
                        width={56}
                        height={56}
                        className="size-14 rounded-lg object-cover ring-1 ring-border"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {image.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(image.file.size)}
                        </p>
                        {imageError ? (
                          <p
                            className="mt-1 text-sm font-medium text-destructive-text"
                            role="alert"
                          >
                            {imageError.message}
                          </p>
                        ) : (
                          <p
                            className={cn(
                              'mt-1 inline-flex items-center gap-1.5 text-sm font-semibold',
                              isWorking
                                ? 'text-muted-foreground'
                                : 'text-positive-text',
                            )}
                          >
                            {isWorking ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            {isWorking
                              ? (statusText ??
                                (uploadMode === 'immediate'
                                  ? 'Uploading…'
                                  : 'Saving…'))
                              : 'Added'}
                          </p>
                        )}
                      </div>
                      <div className="col-start-2 flex flex-wrap gap-2 sm:col-start-3 sm:row-start-1">
                        {imageError && onRetryImage ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={intakeBusy}
                            onClick={() => void onRetryImage(image)}
                          >
                            <RotateCw className="size-4" />
                            Retry
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={intakeBusy}
                          onClick={() => onRemoveImage(index)}
                        >
                          <X className="size-4" />
                          Remove
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!open && imageErrors.length > 0 ? (
        <p className="text-sm font-semibold text-destructive-text" role="alert">
          {attentionMessage}
        </p>
      ) : helperText ? (
        <div className="text-sm text-muted-foreground">{helperText}</div>
      ) : null}

      <div className="sr-only" role="status" aria-live="polite">
        {statusText ??
          (isImporting
            ? 'Downloading picture'
            : imageErrors.length > 0
              ? attentionMessage
              : readyLabel)}
      </div>
      {footer}
    </div>
  )
}
