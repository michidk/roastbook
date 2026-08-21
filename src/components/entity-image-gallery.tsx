import { ImageIcon, Loader2, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { PictureUploadDialog } from '@/components/picture-upload-dialog'
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
} from '@/components/ui/dialog'
import { type ImageFile, useImageUpload } from '@/hooks/useImageUpload'
import { getErrorMessage } from '@/lib/error-message'
import { thumbnailUrl } from '@/lib/image-url'
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
  const {
    images: queuedImages,
    fileInputRef,
    addFiles,
    importFromUrl,
    pasteFromClipboard,
    removeImage,
    removeImages,
    openFilePicker,
  } = useImageUpload()

  if (images.length === 0 && !editable) return null

  const uploadPictures = async (pictures: readonly ImageFile[]) => {
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
          toast.error(
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
    setIsSettingThumbnail(imageId)
    try {
      try {
        await setImageAsThumbnail({ data: { entityType, entityId, imageId } })
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to set thumbnail'))
        return
      }
      try {
        await onImagesChange()
      } catch (error) {
        toast.error(
          getErrorMessage(error, 'Thumbnail changed, but the gallery is stale'),
        )
      }
    } finally {
      setIsSettingThumbnail(null)
    }
  }

  const handleDeleteImage = async (image: EntityImage) => {
    setIsDeletingImage(image.id)
    try {
      try {
        await deleteEntityImage({
          data: { entityType, entityId, imageId: image.id },
        })
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to delete image'))
        return
      }
      try {
        await onImagesChange()
      } catch (error) {
        toast.error(
          getErrorMessage(error, 'Picture deleted, but the gallery is stale'),
        )
      }
    } finally {
      setIsDeletingImage(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pictures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 && (
          <div
            className={cn(
              'grid grid-cols-2 gap-4',
              !imageAction && 'sm:grid-cols-3',
            )}
          >
            {images.map((image, index) => (
              <div key={image.id} className="group relative">
                <ImageWithFallback
                  src={thumbnailUrl(image.storagePath)}
                  alt={`${entityType === 'beans' ? 'Bean' : 'Gear'} picture ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  width={640}
                  height={640}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                {editable && (
                  <div className="absolute inset-0 rounded-lg opacity-100 transition-colors [@media(hover:hover)]:group-hover:bg-foreground/55">
                    {imageAction && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-2 left-2 h-11 px-3 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 [@media(hover:hover)]:h-8"
                        onClick={() => {
                          void Promise.resolve(
                            imageAction.onSelect(image),
                          ).catch((error) => {
                            toast.error(
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
                          <ImageIcon className="h-4 w-4" />
                        )}
                        {imageAction.pendingImageId === image.id
                          ? 'Filling…'
                          : 'Fill'}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant={image.isThumbnail ? 'default' : 'secondary'}
                      className="absolute left-2 top-2 h-11 w-11 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 sm:w-11 [@media(hover:hover)]:h-8 [@media(hover:hover)]:w-8"
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
                          className="absolute right-2 top-2 h-11 w-11 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 sm:w-11 [@media(hover:hover)]:h-8 [@media(hover:hover)]:w-8"
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
          <PictureUploadDialog
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
            onPasteFromClipboard={async () => {
              const pictures = await pasteFromClipboard()
              await uploadPictures(pictures)
              return pictures
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
                ? 'Add more bean pictures'
                : 'Add more equipment pictures'
            }
            previewAltPrefix={entityType === 'beans' ? 'Bean' : 'Gear'}
            uploadMode="immediate"
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
            onRetryImage={(image) => uploadPictures([image])}
          />
        )}
      </CardContent>
    </Card>
  )
}
