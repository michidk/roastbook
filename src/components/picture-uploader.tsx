import {
  ChevronDown,
  CircleAlert,
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
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import type { ImageFile } from '@/hooks/useImageUpload'
import { getImageUploadErrorMessage } from '@/lib/image-upload-error'
import { cn } from '@/lib/utils'

interface PictureUploaderProps {
  readonly images: readonly ImageFile[]
  readonly fileInputRef: RefObject<HTMLInputElement | null>
  readonly onFilesAdded: (
    files: readonly File[],
  ) => Promise<readonly ImageFile[]>
  readonly onImportFromUrl: (url: string) => Promise<ImageFile>
  readonly onRemoveImage: (index: number) => void
  readonly onOpenFilePicker: () => void
  readonly prompt: string
  readonly previewAltPrefix: string
  readonly isBusy?: boolean
  readonly statusText?: string
  readonly helperText?: ReactNode
  readonly footer?: ReactNode
  readonly showIntake?: boolean
  readonly imageErrors?: readonly {
    readonly preview: string
    readonly filename: string
    readonly message: string
  }[]
  readonly onRetryImages?: (
    images: readonly ImageFile[],
  ) => void | Promise<void>
}

async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof Response) {
    try {
      const payload: unknown = await error.clone().json()
      return getImageUploadErrorMessage(payload)
    } catch {
      return getImageUploadErrorMessage(error)
    }
  }
  return getImageUploadErrorMessage(error)
}

function clipboardFiles(event: ClipboardEvent | ReactClipboardEvent): File[] {
  const directFiles = Array.from(event.clipboardData?.files ?? [])
  if (directFiles.length > 0) return directFiles

  return Array.from(event.clipboardData?.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
}

function InlineError({
  message,
  onDismiss,
}: {
  readonly message: string
  readonly onDismiss: () => void
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-destructive/45 bg-destructive/10 px-3 py-3 text-destructive-text"
      role="alert"
    >
      <CircleAlert className="mt-0.5 size-5 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-semibold">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss error"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function PictureUploader({
  images,
  fileInputRef,
  onFilesAdded,
  onImportFromUrl,
  onRemoveImage,
  onOpenFilePicker,
  prompt,
  previewAltPrefix,
  isBusy = false,
  statusText,
  helperText,
  footer,
  showIntake = true,
  imageErrors = [],
  onRetryImages,
}: PictureUploaderProps) {
  const [urlOpen, setUrlOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isAddingFiles, setIsAddingFiles] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const urlInputId = useId()
  const formatHintId = useId()
  const intakeBusy = isBusy || isAddingFiles || isImporting || isRetrying

  const errorByPreview = useMemo(
    () =>
      new Map(
        imageErrors.map((error) => [
          error.preview,
          {
            ...error,
            message: getImageUploadErrorMessage(error.message),
          },
        ]),
      ),
    [imageErrors],
  )
  const activeErrors = images.flatMap((image) => {
    const error = errorByPreview.get(image.preview)
    return error ? [{ image, error }] : []
  })
  const failedImages = activeErrors.map(({ image }) => image)
  const failureMessage = activeErrors[0]?.error.message

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      setFileError(null)
      setIsAddingFiles(true)
      try {
        await onFilesAdded(files)
      } catch (error) {
        setFileError(await errorMessage(error))
      } finally {
        setIsAddingFiles(false)
      }
    },
    [onFilesAdded],
  )

  useEffect(() => {
    if (!showIntake) return

    const handleWindowPaste = (event: ClipboardEvent) => {
      const root = rootRef.current
      const activeElement = document.activeElement
      if (!root || !activeElement || !root.contains(activeElement)) return
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement.getAttribute('contenteditable') === 'true'
      ) {
        return
      }

      const files = clipboardFiles(event)
      if (intakeBusy || files.length === 0) return
      event.preventDefault()
      void addFiles(files)
    }

    window.addEventListener('paste', handleWindowPaste)
    return () => window.removeEventListener('paste', handleWindowPaste)
  }, [addFiles, intakeBusy, showIntake])

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (!intakeBusy) void addFiles(Array.from(event.dataTransfer.files))
  }

  const handlePaste = (event: ReactClipboardEvent<HTMLButtonElement>) => {
    const files = clipboardFiles(event)
    if (intakeBusy || files.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    void addFiles(files)
  }

  const handleUrlImport = async () => {
    const url = imageUrl.trim()
    if (!url) return
    setUrlError(null)
    setIsImporting(true)
    try {
      await onImportFromUrl(url)
      setImageUrl('')
      setUrlOpen(false)
    } catch (error) {
      const message = await errorMessage(error)
      setUrlError(
        message.toLowerCase().includes('invalid url')
          ? 'Enter a valid picture URL'
          : message,
      )
    } finally {
      setIsImporting(false)
    }
  }

  const handleRetry = async () => {
    if (!onRetryImages || failedImages.length === 0) return
    setFileError(null)
    setIsRetrying(true)
    try {
      await onRetryImages(failedImages)
    } catch (error) {
      setFileError(await errorMessage(error))
    } finally {
      setIsRetrying(false)
    }
  }

  const readyLabel = `${images.length} ${
    images.length === 1 ? 'picture' : 'pictures'
  } added`
  const failureLabel = `${activeErrors.length} ${
    activeErrors.length === 1 ? 'picture could' : 'pictures could'
  } not be uploaded`

  return (
    <div ref={rootRef} className="space-y-3" aria-busy={intakeBusy}>
      {images.length > 0 ? (
        <ul
          className="grid grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-2"
          aria-label="Selected pictures"
        >
          {images.map((image, index) => {
            const imageError = errorByPreview.get(image.preview)
            return (
              <li
                key={image.preview}
                className={cn(
                  'group relative min-w-0 overflow-hidden rounded-xl border border-border bg-muted shadow-coffee',
                  imageError &&
                    'border-destructive/70 ring-1 ring-destructive/20',
                )}
              >
                <img
                  src={image.preview}
                  alt={`${previewAltPrefix} ${index + 1}`}
                  width={240}
                  height={240}
                  className="aspect-square w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-foreground/45 to-transparent" />
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
                  <span className="absolute inset-x-1 bottom-1 inline-flex min-h-7 items-center justify-center gap-1 rounded-lg bg-destructive px-2 py-1 text-xs font-bold text-white shadow-sm">
                    <CircleAlert className="size-3.5" />
                    Failed
                  </span>
                ) : isBusy ? (
                  <span className="absolute inset-x-1 bottom-1 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-foreground/85 px-2 py-1 text-xs font-bold text-background shadow-sm backdrop-blur-sm">
                    <Loader2 className="size-3.5 animate-spin" />
                    {statusText ?? 'Working…'}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {showIntake ? (
        <Collapsible
          open={urlOpen}
          onOpenChange={(open) => {
            setUrlOpen(open)
            if (!open) setUrlError(null)
          }}
          className="space-y-2"
        >
          <button
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
            aria-describedby={formatHintId}
            className={cn(
              'group flex min-h-28 w-full items-center gap-3 rounded-xl border-2 border-dashed border-input bg-secondary/25 px-4 py-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45 disabled:cursor-wait disabled:opacity-60',
              isDragging && 'border-primary bg-primary/10',
              images.length > 0 && 'min-h-24',
            )}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-link transition-transform group-hover:scale-105">
              {intakeBusy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : isDragging ? (
                <UploadCloud className="size-5" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base font-bold text-foreground">
                {isDragging
                  ? 'Drop pictures here'
                  : images.length > 0
                    ? 'Add more pictures'
                    : prompt}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Choose, drop, or paste
              </span>
            </span>
          </button>

          <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
            <p
              id={formatHintId}
              className="text-xs font-medium text-muted-foreground"
            >
              Images up to 10 MB
              <span className="sr-only">
                . Supported formats: JPG, PNG, WebP, HEIC, HEIF, GIF and AVIF.
              </span>
            </p>
            <CollapsibleTrigger
              disabled={intakeBusy}
              className="group flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 font-display text-sm font-bold text-link transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link2 className="size-4" />
              From URL
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  urlOpen && 'rotate-180',
                )}
              />
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none">
            <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/20 p-3">
              <label htmlFor={urlInputId} className="text-sm font-semibold">
                Picture URL
              </label>
              <div className="flex min-w-0 flex-col gap-2">
                <Input
                  id={urlInputId}
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="https://example.com/picture.jpg"
                  value={imageUrl}
                  disabled={intakeBusy}
                  aria-invalid={Boolean(urlError)}
                  aria-describedby={
                    urlError ? `${urlInputId}-error` : undefined
                  }
                  onChange={(event) => {
                    setImageUrl(event.target.value)
                    if (urlError) setUrlError(null)
                  }}
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
                  Add picture
                </Button>
              </div>
              {urlError ? (
                <p
                  id={`${urlInputId}-error`}
                  className="text-sm font-semibold text-destructive-text"
                  role="alert"
                >
                  {urlError}
                </p>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/avif,image/gif,image/heic,image/heif,image/jpeg,image/png,image/webp,.heic,.heif"
        multiple
        disabled={intakeBusy || !showIntake}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) void addFiles(files)
        }}
        className="sr-only"
        tabIndex={-1}
      />

      {fileError ? (
        <InlineError message={fileError} onDismiss={() => setFileError(null)} />
      ) : null}

      {activeErrors.length > 0 ? (
        <div
          className="rounded-xl border border-destructive/45 bg-destructive/10 p-3 text-destructive-text"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">{failureLabel}</p>
              {failureMessage ? (
                <p className="mt-1 text-sm leading-snug">{failureMessage}</p>
              ) : null}
            </div>
          </div>
          {onRetryImages ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 bg-card"
              disabled={intakeBusy}
              onClick={() => void handleRetry()}
            >
              {isRetrying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCw className="size-4" />
              )}
              Retry upload
            </Button>
          ) : null}
        </div>
      ) : null}

      {helperText ? (
        <div className="text-sm text-muted-foreground">{helperText}</div>
      ) : null}
      <div className="sr-only" role="status" aria-live="polite">
        {statusText ??
          (isAddingFiles
            ? 'Adding pictures'
            : isImporting
              ? 'Downloading picture'
              : isRetrying
                ? 'Retrying picture uploads'
                : activeErrors.length > 0
                  ? failureLabel
                  : readyLabel)}
      </div>
      {footer}
    </div>
  )
}
