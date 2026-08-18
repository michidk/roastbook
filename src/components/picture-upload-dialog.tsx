import {
  Check,
  ClipboardPaste,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Plus,
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
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { ScrollArea } from '@/components/ui/scroll-area'
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
  readonly isBusy?: boolean
  readonly statusText?: string
  readonly helperText?: ReactNode
  readonly footer?: ReactNode
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not add that picture'
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
  isBusy = false,
  statusText,
  helperText,
  footer,
}: PictureUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isAwaitingPaste, setIsAwaitingPaste] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const dropzoneRef = useRef<HTMLButtonElement>(null)
  const intakeBusy = isBusy || isImporting

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      try {
        await onFilesAdded(files)
      } catch (error) {
        toast.error(errorMessage(error))
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
    setIsAwaitingPaste(true)
    dropzoneRef.current?.focus()
  }

  const handleClipboardButton = async () => {
    if (!navigator.clipboard?.read) {
      promptForKeyboardPaste()
      return
    }

    try {
      await onPasteFromClipboard()
      setIsAwaitingPaste(false)
    } catch {
      promptForKeyboardPaste()
    }
  }

  const handleUrlImport = async () => {
    const url = imageUrl.trim()
    if (!url) return
    setIsImporting(true)
    try {
      await onImportFromUrl(url)
      setImageUrl('')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setIsImporting(false)
    }
  }

  const readyLabel = `${images.length} ${images.length === 1 ? 'picture' : 'pictures'} ready`

  return (
    <div className="space-y-4" aria-busy={intakeBusy}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <div
            key={image.preview}
            className="group relative overflow-hidden rounded-xl border border-border bg-muted shadow-coffee"
          >
            <img
              src={image.preview}
              alt={`${previewAltPrefix} ${index + 1}`}
              width={360}
              height={360}
              className="aspect-square w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/40 to-transparent" />
            <button
              type="button"
              onClick={() => onRemoveImage(index)}
              disabled={intakeBusy}
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full border border-white/25 bg-foreground/75 text-background shadow-sm backdrop-blur-sm transition hover:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label={`Remove ${previewAltPrefix.toLowerCase()} picture ${index + 1}`}
            >
              <X className="size-4" />
            </button>
            <span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
              Picture {index + 1}
            </span>
          </div>
        ))}

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && intakeBusy) return
            setOpen(nextOpen)
            if (!nextOpen) {
              setIsDragging(false)
              setIsAwaitingPaste(false)
            }
          }}
        >
          <DialogTrigger
            render={
              <button
                type="button"
                disabled={intakeBusy}
                className={cn(
                  'group flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/35 bg-gradient-to-br from-primary/10 via-secondary/60 to-card p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/65 hover:shadow-coffee focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60',
                  images.length === 0 && 'col-span-2 sm:col-span-3 sm:min-h-44',
                )}
              />
            }
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-link transition-transform group-hover:scale-105">
              {images.length > 0 ? (
                <Plus className="size-5" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </span>
            <span className="mt-3 font-display text-sm font-bold text-foreground">
              {images.length > 0 ? 'Add another' : prompt}
            </span>
            {images.length === 0 ? (
              <span className="mt-1 text-xs text-muted-foreground">
                Drop, paste, browse, or import a URL
              </span>
            ) : null}
          </DialogTrigger>

          <DialogContent
            className="max-h-[90vh] w-full grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
            showCloseButton={!intakeBusy}
          >
            <DialogHeader className="border-b border-border bg-gradient-to-r from-primary/12 via-card to-card px-5 py-5 pr-14 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-link ring-1 ring-primary/15">
                  <Images className="size-5" />
                </span>
                <div className="space-y-1">
                  <DialogTitle className="font-display text-xl font-bold">
                    Add pictures
                  </DialogTitle>
                  <DialogDescription>{prompt}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-5">
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
                  'relative flex min-h-52 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/35 bg-secondary/45 px-6 py-8 text-center transition-all hover:border-primary/65 hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-65',
                  isDragging &&
                    'scale-[1.01] border-primary bg-primary/12 shadow-coffee-strong',
                  isAwaitingPaste &&
                    'border-primary bg-primary/12 ring-2 ring-primary/20',
                )}
              >
                <span className="absolute -right-10 -top-10 size-36 rounded-full bg-primary/10 blur-2xl" />
                <span className="absolute -bottom-12 -left-8 size-32 rounded-full bg-coffee/10 blur-2xl" />
                <span
                  className={cn(
                    'relative flex size-14 items-center justify-center rounded-2xl bg-card text-link shadow-coffee ring-1 ring-border transition-transform',
                    isDragging && 'scale-110',
                  )}
                >
                  {intakeBusy ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <UploadCloud className="size-6" />
                  )}
                </span>
                <span className="relative mt-4 font-display text-lg font-bold text-foreground">
                  {isDragging
                    ? 'Drop them here'
                    : isAwaitingPaste
                      ? 'Paste your picture now'
                      : 'Drop pictures here'}
                </span>
                <span className="relative mt-1 text-sm text-muted-foreground">
                  {isAwaitingPaste
                    ? 'Press Ctrl+V or Cmd+V'
                    : 'or click to choose from your device'}
                </span>
                <span className="relative mt-4 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  JPG, PNG, WebP, HEIC · up to 10 MB
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
                  if (files.length > 0) void addFiles(files)
                }}
                className="sr-only"
                tabIndex={-1}
              />

              <div className="flex items-center gap-3" aria-hidden="true">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Or add another way
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-3 sm:grid-cols-[0.85fr_1.5fr]">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-24 justify-start rounded-xl px-4 py-3 text-left"
                  disabled={intakeBusy}
                  onClick={() => void handleClipboardButton()}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <ClipboardPaste className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-bold">
                      {isAwaitingPaste ? 'Ready to paste' : 'Paste'}
                    </span>
                    <span className="block whitespace-normal text-xs font-medium text-muted-foreground">
                      {isAwaitingPaste
                        ? 'Press Ctrl+V or Cmd+V'
                        : 'Use your clipboard'}
                    </span>
                  </span>
                </Button>

                <fieldset className="min-w-0 rounded-xl border border-border bg-card p-3">
                  <legend className="sr-only">Add picture from URL</legend>
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                    <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <Link2 className="size-3.5" />
                    </span>
                    Import from URL
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <Input
                      type="url"
                      inputMode="url"
                      aria-label="Picture URL"
                      placeholder="https://…"
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
                      size="icon"
                      className="shrink-0"
                      disabled={intakeBusy || !imageUrl.trim()}
                      onClick={() => void handleUrlImport()}
                      aria-label="Import picture URL"
                    >
                      {isImporting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </Button>
                  </div>
                </fieldset>
              </div>

              {images.length > 0 ? (
                <div className="rounded-xl border border-border bg-secondary/35 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-foreground">
                      Ready to use
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {readyLabel}
                    </span>
                  </div>
                  <ScrollArea orientation="horizontal" className="w-full">
                    <div className="flex gap-2 pb-3">
                      {images.map((image, index) => (
                        <div key={image.preview} className="relative shrink-0">
                          <img
                            src={image.preview}
                            alt={`${previewAltPrefix} ${index + 1}`}
                            width={80}
                            height={80}
                            className="size-16 rounded-lg object-cover ring-1 ring-border sm:size-20"
                          />
                          <button
                            type="button"
                            onClick={() => onRemoveImage(index)}
                            disabled={intakeBusy}
                            className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            aria-label={`Remove ${previewAltPrefix.toLowerCase()} picture ${index + 1}`}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}
            </DialogBody>

            <DialogFooter className="m-0 gap-3 rounded-b-xl px-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                {intakeBusy ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    {statusText ?? 'Adding pictures…'}
                  </span>
                ) : (
                  (helperText ?? 'Tip: paste a picture anywhere in this dialog')
                )}
              </div>
              <Button
                type="button"
                onClick={() => setOpen(false)}
                disabled={intakeBusy}
                className="shrink-0"
              >
                <Check className="size-4" />
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {statusText ?? (isImporting ? 'Downloading picture' : readyLabel)}
      </div>
      {footer}
    </div>
  )
}
