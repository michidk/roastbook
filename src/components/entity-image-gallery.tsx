import { Button } from '@roastbook/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@roastbook/ui/card'
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
} from '@roastbook/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Loader2,
  Sparkles,
  Star,
  WandSparkles,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import {
  BeautifyImageToggle,
  useBeautifyAvailable,
} from '@/components/beautify-image-toggle'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { PictureUploader } from '@/components/picture-uploader'
import { useImageUpload } from '@/hooks/use-image-upload'
import {
  deleteEntityImage,
  setImageAsThumbnail,
  uploadEntityImage,
} from '@/journal/images'
import {
  beautifyEntityImage,
  beautifyKey,
  beautifyUploadedImage,
  useBeautifyingImages,
} from '@/lib/client/beautify-image'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import { getErrorMessage } from '@/lib/error-message'
import type { ImageFile } from '@/lib/image-file'
import { imageUrl, thumbnailUrl } from '@/lib/image-url'
import type { EntityImageUploadFailure } from '@/lib/upload-entity-images'
import { cn } from '@/lib/utils'

export interface EntityImage {
  readonly id: number
  readonly beautifiedFromImageId?: number | null
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
  readonly entityType: 'bean-purchases' | 'gear'
  readonly entityId: number
  readonly images: readonly EntityImage[]
  readonly imageAction?: EntityImageAction
  readonly editable?: boolean
}

export function EntityImageGallery({
  entityType,
  entityId,
  images,
  imageAction,
  editable = false,
}: EntityImageGalleryProps) {
  const [isSettingThumbnail, setIsSettingThumbnail] = useState<number | null>(
    null,
  )
  const [isDeletingImage, setIsDeletingImage] = useState<number | null>(null)
  const [beautifyingImage, setBeautifyingImage] = useState<number | null>(null)
  const canBeautify = useBeautifyAvailable() && editable
  const beautifying = useBeautifyingImages()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFailures, setUploadFailures] = useState<
    readonly EntityImageUploadFailure[]
  >([])
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const {
    maxImages,
    images: queuedImages,
    fileInputRef,
    addFiles,
    importFromUrl,
    removeImage,
    removeImages,
    openFilePicker,
  } = useImageUpload({
    // Beautified copies do not use up the per-item picture limit.
    existingImageCount: images.filter(
      (image) =>
        image.beautifiedFromImageId == null &&
        (entityType !== 'bean-purchases' || image.beanPurchaseId === entityId),
    ).length,
  })

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

    const uploaded: ImageFile[] = []
    const failures: EntityImageUploadFailure[] = []

    try {
      for (const picture of pictures) {
        try {
          const saved = await uploadEntityImage({
            data: createEntityImageUploadFormData(
              entityType,
              entityId,
              picture.file,
              picture,
            ),
          })
          beautifyUploadedImage({
            entityType,
            entityId,
            imageId: saved.id,
          })
          uploaded.push(picture)
        } catch (error) {
          failures.push({ image: picture, error })
        }
      }

      removeImages(uploaded)
      setUploadFailures((current) => [
        ...current.filter(({ image }) => !attemptedPreviews.has(image.preview)),
        ...failures,
      ])
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
        beautifyUploadedImage({
          entityType,
          entityId: entityIdForImage(image),
          imageId: image.id,
        })
      } catch (error) {
        setGalleryError(getErrorMessage(error, 'Failed to set thumbnail'))
      }
    } finally {
      setIsSettingThumbnail(null)
    }
  }

  const handleBeautify = async (image: EntityImage) => {
    setGalleryError(null)
    setBeautifyingImage(image.id)
    try {
      await beautifyEntityImage({
        entityType,
        entityId: entityIdForImage(image),
        imageId: image.id,
      })
    } catch (error) {
      setGalleryError(
        getErrorMessage(
          error,
          'Could not beautify this picture. Your original is safe.',
        ),
      )
    } finally {
      setBeautifyingImage(null)
    }
  }

  const handleDeleteImage = async (image: EntityImage) => {
    setGalleryError(null)
    setIsDeletingImage(image.id)
    try {
      try {
        await deleteEntityImage({
          data: {
            entityType,
            entityId: entityIdForImage(image),
            imageId: image.id,
            idempotent: true,
          },
        })
      } catch (error) {
        setGalleryError(getErrorMessage(error, 'Failed to delete image'))
      }
    } finally {
      setIsDeletingImage(null)
    }
  }

  const entityLabel = entityType === 'bean-purchases' ? 'Coffee' : 'Gear'
  const mainImage = images.find((image) => image.isThumbnail) ?? images[0]
  const isMainImage = (image: EntityImage) => image.id === mainImage?.id
  const canBeautifyImage = (image: EntityImage) =>
    canBeautify &&
    image.beautifiedFromImageId == null &&
    !images.some((copy) => copy.beautifiedFromImageId === image.id)
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
            {images.map((image, index) => {
              const isBeautifying = beautifying.has(
                beautifyKey(entityType, image.id),
              )
              return (
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
                      <Button
                        size="icon"
                        variant={isMainImage(image) ? 'default' : 'secondary'}
                        className="pointer-events-auto absolute left-1 top-1 size-7 after:absolute after:-inset-2 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary"
                        onClick={() => handleSetThumbnail(image)}
                        disabled={
                          isSettingThumbnail === image.id || isMainImage(image)
                        }
                        aria-pressed={isMainImage(image)}
                        aria-label={
                          isMainImage(image)
                            ? 'Main image'
                            : `Use picture ${index + 1} as main image`
                        }
                        title={
                          isMainImage(image)
                            ? 'Main image'
                            : 'Use as main image'
                        }
                      >
                        <Star
                          className={cn(
                            'size-3.5',
                            isMainImage(image) && 'fill-current',
                          )}
                        />
                      </Button>
                      {canBeautifyImage(image) ? (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="pointer-events-auto absolute bottom-1 left-1 size-7 after:absolute after:-inset-2 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary"
                          disabled={
                            isBeautifying ||
                            beautifyingImage !== null ||
                            isUploading ||
                            isDeletingImage !== null
                          }
                          aria-busy={isBeautifying}
                          aria-label={
                            isBeautifying
                              ? `Beautifying picture ${index + 1}…`
                              : `Beautify picture ${index + 1}`
                          }
                          title={
                            isBeautifying ? 'Beautifying…' : 'Beautify with AI'
                          }
                          onClick={() => void handleBeautify(image)}
                        >
                          {isBeautifying ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <WandSparkles className="size-3.5" />
                          )}
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
              )
            })}
          </div>
        )}
        {editable && (
          <PictureUploader
            maxImages={maxImages}
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
                : 'Add equipment pictures'
            }
            previewAltPrefix={
              entityType === 'bean-purchases' ? 'Coffee' : 'Gear'
            }
            isBusy={isUploading || beautifyingImage !== null}
            statusText={isUploading ? 'Saving pictures…' : undefined}
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
        {editable && (
          <BeautifyImageToggle
            disabled={isUploading || beautifyingImage !== null}
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
                className="max-h-[65dvh] w-auto max-w-full rounded-xl object-contain"
              />
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  variant={isMainImage(lightboxImage) ? 'default' : 'secondary'}
                  disabled={
                    isMainImage(lightboxImage) || isSettingThumbnail !== null
                  }
                  aria-pressed={isMainImage(lightboxImage)}
                  onClick={() => void handleSetThumbnail(lightboxImage)}
                >
                  <Star
                    className={cn(isMainImage(lightboxImage) && 'fill-current')}
                  />
                  {isMainImage(lightboxImage)
                    ? 'Main image'
                    : 'Use as main image'}
                </Button>
                {canBeautifyImage(lightboxImage) && (
                  <Button
                    variant="secondary"
                    disabled={
                      beautifying.has(
                        beautifyKey(entityType, lightboxImage.id),
                      ) ||
                      beautifyingImage !== null ||
                      isUploading ||
                      isDeletingImage !== null
                    }
                    aria-busy={beautifying.has(
                      beautifyKey(entityType, lightboxImage.id),
                    )}
                    onClick={() => void handleBeautify(lightboxImage)}
                  >
                    {beautifying.has(
                      beautifyKey(entityType, lightboxImage.id),
                    ) ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <WandSparkles />
                    )}
                    Beautify with AI
                  </Button>
                )}
                {galleryError && (
                  <p
                    role="alert"
                    className="w-full text-center text-sm text-destructive-text"
                  >
                    {galleryError}
                  </p>
                )}
              </div>
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
