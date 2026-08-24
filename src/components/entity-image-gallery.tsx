import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Loader2,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
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
import { getErrorMessage } from '@/lib/error-message'
import type { ImageFile } from '@/lib/image-file'
import { imageUrl, thumbnailUrl } from '@/lib/image-url'
import { deleteEntityImage, setImageAsThumbnail } from '@/lib/server/images'
import {
  type EntityImageUploadFailure,
  uploadEntityImages,
} from '@/lib/upload-entity-images'
import { cn } from '@/lib/utils'

export interface EntityImage {
  readonly id: number
  readonly storagePath: string
  readonly isThumbnail: boolean
}

interface EntityImageAction {
  readonly label: string
  readonly pendingImageId: number | null
  readonly disabled?: boolean
  readonly onSelect: (image: EntityImage) => void | Promise<void>
}

interface EntityImageGalleryProps {
  readonly entityType: 'beans' | 'gear'
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
    try {
      const result = await uploadEntityImages(entityType, entityId, pictures)
      removeImages(result.uploaded)
      setUploadFailures((current) => [
        ...current.filter(({ image }) => !attemptedPreviews.has(image.preview)),
        ...result.failures,
      ])
      if (result.uploaded.length > 0) {
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
      setUploadFailures((current) => [
        ...current.filter(({ image }) => !attemptedPreviews.has(image.preview)),
        ...pictures.map((image) => ({ image, error })),
      ])
    } finally {
      setIsUploading(false)
    }
  }

  const handleSetThumbnail = async (imageId: number) => {
    setGalleryError(null)
    setIsSettingThumbnail(imageId)
    try {
      try {
        await setImageAsThumbnail({ data: { entityType, entityId, imageId } })
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
      try {
        await deleteEntityImage({
          data: { entityType, entityId, imageId: image.id },
        })
      } catch (error) {
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

  const entityLabel = entityType === 'beans' ? 'Bean' : 'Gear'
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
                    {imageAction && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="pointer-events-auto absolute bottom-2 left-2 h-11 px-3 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 [@media(hover:hover)]:h-8"
                        onClick={() => {
                          setGalleryError(null)
                          void Promise.resolve(
                            imageAction.onSelect(image),
                          ).catch((error) => {
                            setGalleryError(
                              getErrorMessage(
                                error,
                                `Could not ${imageAction.label.toLowerCase()}`,
                              ),
                            )
                          })
                        }}
                        disabled={
                          imageAction.disabled ||
                          imageAction.pendingImageId !== null
                        }
                        aria-label={
                          imageAction.pendingImageId === image.id
                            ? `${imageAction.label} using picture ${index + 1}, in progress`
                            : `${imageAction.label} using picture ${index + 1}`
                        }
                        aria-busy={imageAction.pendingImageId === image.id}
                        title={imageAction.label}
                      >
                        {imageAction.pendingImageId === image.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {imageAction.pendingImageId === image.id
                          ? 'Analyzing…'
                          : 'Use AI'}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant={image.isThumbnail ? 'default' : 'secondary'}
                      className="pointer-events-auto absolute left-2 top-2 h-11 w-11 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 sm:w-11 [@media(hover:hover)]:h-8 [@media(hover:hover)]:w-8"
                      onClick={() => handleSetThumbnail(image.id)}
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
                          'h-4 w-4',
                          image.isThumbnail && 'fill-current',
                        )}
                      />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="pointer-events-auto absolute right-2 top-2 h-11 w-11 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 sm:w-11 [@media(hover:hover)]:h-8 [@media(hover:hover)]:w-8"
                          disabled={isDeletingImage === image.id}
                          aria-label={`Delete picture ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
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
        {imageAction?.pendingImageId !== null &&
          imageAction?.pendingImageId !== undefined && (
            <span className="sr-only" role="status">
              {imageAction.label} in progress
            </span>
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
              entityType === 'beans'
                ? 'Add bean pictures'
                : 'Add equipment pictures'
            }
            previewAltPrefix={entityType === 'beans' ? 'Bean' : 'Gear'}
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
