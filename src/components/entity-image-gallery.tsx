import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Loader2,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { PictureUploader } from '@/components/picture-uploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import { getErrorMessage } from '@/lib/error-message'
import type { ImageFile } from '@/lib/image-file'
import { isImageUploadNetworkError } from '@/lib/image-upload-error'
import { imageUrl, thumbnailUrl } from '@/lib/image-url'
import {
  deleteEntityImage,
  setImageAsThumbnail,
  uploadEntityImage,
  uploadEntityImageBase64,
} from '@/lib/server/images'
import type { EntityImageUploadFailure } from '@/lib/upload-entity-images'
import { cn } from '@/lib/utils'
import {
  enqueueImageDelete,
  enqueueImageUpload,
} from '@/modules/offline/entity-operations'

export interface EntityImage {
  readonly id: number
  readonly storagePath: string
  readonly isThumbnail?: boolean
  readonly beanPurchaseId?: number
}

interface EntityImageAction {
  readonly label: string
  readonly isPending: boolean
  readonly disabled?: boolean
  readonly help?: ReactNode
  readonly onSelect: () => void | Promise<void>
}

interface EntityImageGalleryProps {
  readonly entityType: 'bean-purchases' | 'gear' | 'shots'
  readonly entityId: number
  readonly images: readonly EntityImage[]
  readonly onImagesChange: () => void | Promise<void>
  readonly imageAction?: EntityImageAction
  readonly editable?: boolean
}

export function EntityImageGallery({
  entityType,
  entityId,
  images,
  onImagesChange,
  imageAction,
  editable = false,
}: EntityImageGalleryProps) {
  const [isSettingThumbnail, setIsSettingThumbnail] = useState<number | null>(
    null,
  )
  const [isDeletingImage, setIsDeletingImage] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFailures, setUploadFailures] = useState<
    readonly EntityImageUploadFailure[]
  >([])
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const isOnline = useOnlineStatus()
  const {
    images: queuedImages,
    fileInputRef,
    addFiles,
    importFromUrl,
    removeImage,
    removeImages,
    openFilePicker,
  } = useImageUpload()

  if (images.length === 0 && !editable) return null

  const uploadPictures = async (pictures: readonly ImageFile[]) => {
    setGalleryError(null)
    const attemptedPreviews = new Set(
      pictures.map((picture) => picture.preview),
    )
    setUploadFailures((current) =>
      current.filter(({ image }) => !attemptedPreviews.has(image.preview)),
    )
    setIsUploading(true)

    const entityLabelForFiles =
      entityType === 'bean-purchases'
        ? 'Coffee'
        : entityType === 'gear'
          ? 'Gear'
          : 'Brew'
    const canQueueOffline = entityType === 'shots'
    const uploaded: ImageFile[] = []
    const queued: ImageFile[] = []
    const failures: EntityImageUploadFailure[] = []

    try {
      if (!isOnline && !canQueueOffline) {
        setGalleryError('Pictures for this item need a connection')
        return
      }

      for (const picture of pictures) {
        const clientOperationId = crypto.randomUUID()
        if (isOnline) {
          try {
            await uploadEntityImage({
              data: createEntityImageUploadFormData(
                entityType,
                entityId,
                picture.file,
                clientOperationId,
              ),
            })
            uploaded.push(picture)
            continue
          } catch (error) {
            if (!canQueueOffline && isImageUploadNetworkError(error)) {
              try {
                await uploadEntityImageBase64({
                  data: {
                    entityType,
                    entityId,
                    fileBase64: picture.base64,
                    filename: picture.file.name,
                    mimeType: picture.file.type,
                    sizeBytes: picture.file.size,
                  },
                })
                uploaded.push(picture)
                continue
              } catch (fallbackError) {
                failures.push({ image: picture, error: fallbackError })
                continue
              }
            }
            if (!canQueueOffline || !isImageUploadNetworkError(error)) {
              failures.push({ image: picture, error })
              continue
            }
          }
        }

        try {
          await enqueueImageUpload({
            entityType,
            entityId,
            file: picture.file,
            clientOperationId,
            details: {
              label: entityLabelForFiles,
              detail: picture.file.name,
            },
          })
          queued.push(picture)
        } catch (error) {
          failures.push({ image: picture, error })
        }
      }

      removeImages([...uploaded, ...queued])
      setUploadFailures((current) => [
        ...current.filter(({ image }) => !attemptedPreviews.has(image.preview)),
        ...failures,
      ])
      if (queued.length > 0) {
        toast.success(
          queued.length === 1
            ? 'Picture saved on this device'
            : 'Pictures saved on this device',
        )
      }
      if (uploaded.length > 0) {
        try {
          await onImagesChange()
        } catch (error) {
          setGalleryError(
            getErrorMessage(
              error,
              'Pictures were uploaded, but the gallery could not refresh',
            ),
          )
        }
      }
    } catch (error) {
      setGalleryError(getErrorMessage(error, 'Could not save these pictures'))
    } finally {
      setIsUploading(false)
    }
  }

  const entityIdForImage = (image: EntityImage) =>
    entityType === 'bean-purchases'
      ? (image.beanPurchaseId ?? entityId)
      : entityId

  const handleSetThumbnail = async (image: EntityImage) => {
    if (entityType === 'shots') return
    setGalleryError(null)
    setIsSettingThumbnail(image.id)
    try {
      try {
        await setImageAsThumbnail({
          data: {
            entityType,
            entityId: entityIdForImage(image),
            imageId: image.id,
          },
        })
      } catch (error) {
        setGalleryError(getErrorMessage(error, 'Failed to set thumbnail'))
        return
      }
      try {
        await onImagesChange()
      } catch (error) {
        setGalleryError(
          getErrorMessage(error, 'Thumbnail changed, but the gallery is stale'),
        )
      }
    } finally {
      setIsSettingThumbnail(null)
    }
  }

  const handleDeleteImage = async (image: EntityImage) => {
    setGalleryError(null)
    setIsDeletingImage(image.id)
    try {
      if (!isOnline) {
        if (entityType !== 'shots') {
          setGalleryError('Removing pictures for this item needs a connection')
          return
        }
        await enqueueImageDelete({
          entityType,
          entityId: entityIdForImage(image),
          imageId: image.id,
          details: { label: 'Brew', detail: 'Remove picture' },
        })
        if (!navigator.onLine) {
          try {
            await onImagesChange()
          } catch {
            // removeServerEntityImage already updated the cached brew. Only
            // this rendered gallery may be stale until the next refresh.
          }
        }
        toast.success('Picture removal saved on this device')
        return
      }

      try {
        await deleteEntityImage({
          data: {
            entityType,
            entityId: entityIdForImage(image),
            imageId: image.id,
          },
        })
      } catch (error) {
        if (
          entityType === 'shots' &&
          (!navigator.onLine || isImageUploadNetworkError(error))
        ) {
          try {
            await enqueueImageDelete({
              entityType,
              entityId: entityIdForImage(image),
              imageId: image.id,
              details: { label: 'Brew', detail: 'Remove picture' },
            })
            if (!navigator.onLine) {
              try {
                await onImagesChange()
              } catch {
                // removeServerEntityImage already updated the cached brew. Only
                // this rendered gallery may be stale until the next refresh.
              }
            }
            toast.success('Picture removal saved on this device')
            return
          } catch (queueError) {
            setGalleryError(
              getErrorMessage(queueError, 'Could not save this removal'),
            )
            return
          }
        }
        setGalleryError(getErrorMessage(error, 'Failed to delete image'))
        return
      }
      try {
        await onImagesChange()
      } catch (error) {
        setGalleryError(
          getErrorMessage(error, 'Picture deleted, but the gallery is stale'),
        )
      }
    } finally {
      setIsDeletingImage(null)
    }
  }

  const entityLabel =
    entityType === 'bean-purchases'
      ? 'Coffee'
      : entityType === 'gear'
        ? 'Gear'
        : 'Brew'
  const lightboxImage =
    lightboxIndex === null ? undefined : images[lightboxIndex]

  const stepLightbox = (offset: number) => {
    if (lightboxIndex === null || images.length < 2) return
    setLightboxIndex((lightboxIndex + offset + images.length) % images.length)
  }

  return (
    <Card size={editable ? 'sm' : 'default'}>
      <CardHeader>
        <CardTitle>Pictures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {galleryError ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-destructive/45 bg-destructive/10 px-3 py-3 text-destructive-text"
            role="alert"
          >
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            <p className="min-w-0 flex-1 text-sm font-semibold">
              {galleryError}
            </p>
            <button
              type="button"
              onClick={() => setGalleryError(null)}
              className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss picture error"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {images.length > 0 && (
          <div
            className={cn(
              'grid grid-cols-2 gap-4',
              !imageAction && 'sm:grid-cols-3',
            )}
          >
            {images.map((image, index) => (
              <div key={image.id} className="group relative">
                <button
                  type="button"
                  className="block w-full cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`View ${entityLabel.toLowerCase()} picture ${index + 1} in full size`}
                >
                  <ImageWithFallback
                    src={thumbnailUrl(image.storagePath)}
                    alt={`${entityLabel} picture ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={640}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </button>
                {editable && (
                  <div className="pointer-events-none absolute inset-0 rounded-lg opacity-100 transition-colors [@media(hover:hover)]:group-hover:bg-foreground/55">
                    {entityType !== 'shots' ? (
                      <Button
                        size="icon"
                        variant={image.isThumbnail ? 'default' : 'secondary'}
                        className="pointer-events-auto absolute left-1 top-1 size-7 after:absolute after:-inset-2 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary"
                        onClick={() => handleSetThumbnail(image)}
                        disabled={
                          isSettingThumbnail === image.id || image.isThumbnail
                        }
                        aria-label={
                          image.isThumbnail
                            ? 'Current thumbnail'
                            : `Set picture ${index + 1} as thumbnail`
                        }
                        title={
                          image.isThumbnail
                            ? 'Current thumbnail'
                            : 'Set as thumbnail'
                        }
                      >
                        <Star
                          className={cn(
                            'size-3.5',
                            image.isThumbnail && 'fill-current',
                          )}
                        />
                      </Button>
                    ) : null}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="pointer-events-auto absolute right-1 top-1 size-7 after:absolute after:-inset-2 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary"
                          disabled={isDeletingImage === image.id}
                          aria-label={`Delete picture ${index + 1}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete this picture?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteImage(image)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {editable && (
          <PictureUploader
            images={queuedImages}
            fileInputRef={fileInputRef}
            onFilesAdded={async (files) => {
              const pictures = await addFiles(files)
              await uploadPictures(pictures)
              return pictures
            }}
            onImportFromUrl={async (url) => {
              const picture = await importFromUrl(url)
              await uploadPictures([picture])
              return picture
            }}
            onRemoveImage={(index) => {
              const removedImage = queuedImages[index]
              if (removedImage) {
                setUploadFailures((current) =>
                  current.filter(
                    ({ image }) => image.preview !== removedImage.preview,
                  ),
                )
              }
              removeImage(index)
            }}
            onOpenFilePicker={openFilePicker}
            prompt={
              entityType === 'bean-purchases'
                ? 'Add pictures of this coffee'
                : entityType === 'gear'
                  ? 'Add equipment pictures'
                  : 'Add pictures of this brew'
            }
            previewAltPrefix={
              entityType === 'bean-purchases'
                ? 'Coffee'
                : entityType === 'gear'
                  ? 'Gear'
                  : 'Brew'
            }
            isBusy={isUploading}
            statusText={isUploading ? 'Uploading pictures' : undefined}
            imageErrors={uploadFailures.map(({ image, error }) => ({
              preview: image.preview,
              filename: image.file.name,
              message: getErrorMessage(
                error,
                'The server rejected this picture',
              ),
            }))}
            onRetryImages={uploadPictures}
          />
        )}
        {editable && imageAction && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              className="min-w-0 flex-1"
              disabled={
                imageAction.disabled ||
                imageAction.isPending ||
                isUploading ||
                images.length === 0
              }
              aria-busy={imageAction.isPending}
              onClick={() => {
                setGalleryError(null)
                void Promise.resolve(imageAction.onSelect()).catch((error) => {
                  setGalleryError(
                    getErrorMessage(
                      error,
                      `Could not ${imageAction.label.toLowerCase()}`,
                    ),
                  )
                })
              }}
            >
              {imageAction.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {imageAction.isPending
                ? 'Analyzing pictures…'
                : imageAction.label}
            </Button>
            {imageAction.help}
            {imageAction.isPending && (
              <span className="sr-only" role="status">
                Analyzing all pictures
              </span>
            )}
          </div>
        )}
        <Dialog
          open={lightboxIndex !== null && lightboxImage !== undefined}
          onOpenChange={(open) => {
            if (!open) setLightboxIndex(null)
          }}
        >
          {lightboxIndex !== null && lightboxImage !== undefined && (
            <DialogContent
              className="w-fit max-w-[calc(100%-1rem)] p-2 sm:max-w-[min(1100px,calc(100%-2rem))]"
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') stepLightbox(-1)
                if (event.key === 'ArrowRight') stepLightbox(1)
              }}
            >
              <DialogTitle className="sr-only">
                {entityLabel} picture {lightboxIndex + 1} of {images.length}
              </DialogTitle>
              <ImageWithFallback
                key={lightboxImage.id}
                src={imageUrl(lightboxImage.storagePath)}
                alt={`${entityLabel} picture ${lightboxIndex + 1}`}
                className="max-h-[80dvh] w-auto max-w-full rounded-xl object-contain"
              />
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => stepLightbox(-1)}
                    aria-label="Previous picture"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {lightboxIndex + 1} / {images.length}
                  </span>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => stepLightbox(1)}
                    aria-label="Next picture"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </DialogContent>
          )}
        </Dialog>
      </CardContent>
    </Card>
  )
}
