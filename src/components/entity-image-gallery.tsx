import { useState } from "react"
import { ImageIcon, Loader2, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "@/components/ui/dialog"
import { setImageAsThumbnail, deleteEntityImage } from "@/lib/server/images"
import { thumbnailUrl } from "@/lib/image-url"
import { cn } from "@/lib/utils"
import { ResilientImage } from "@/components/resilient-image"
import { ImageUploadField } from "@/components/image-upload-field"
import { useImageUpload, type ImageFile } from "@/hooks/useImageUpload"
import { uploadEntityImage } from "@/lib/server/images"

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
  readonly entityType: "beans" | "gear"
  readonly entityId: number
  readonly images: readonly EntityImage[]
  readonly onImagesChange: () => void | Promise<void>
  readonly imageAction?: EntityImageAction
  readonly readOnly?: boolean
}

export function EntityImageGallery({
  entityType,
  entityId,
  images,
  onImagesChange,
  imageAction,
  readOnly = false,
}: EntityImageGalleryProps) {
  const [isSettingThumbnail, setIsSettingThumbnail] = useState<number | null>(null)
  const [isDeletingImage, setIsDeletingImage] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const {
    images: queuedImages,
    fileInputRef,
    addFiles,
    importFromUrl,
    pasteFromClipboard,
    removeImage,
    clearImages,
    openFilePicker,
  } = useImageUpload()

  if (images.length === 0 && readOnly) return null

  const uploadPictures = async (pictures: readonly ImageFile[]) => {
    setIsUploading(true)
    try {
      for (const picture of pictures) {
        await uploadEntityImage({
          data: {
            entityType,
            entityId,
            fileBase64: picture.base64,
            filename: picture.file.name,
            mimeType: picture.file.type,
            sizeBytes: picture.file.size,
          },
        })
      }
      clearImages()
      await onImagesChange()
    } finally {
      setIsUploading(false)
    }
  }

  const handleSetThumbnail = async (imageId: number) => {
    setIsSettingThumbnail(imageId)
    try {
      await setImageAsThumbnail({ data: { entityType, entityId, imageId } })
      onImagesChange()
    } catch {
      toast.error("Failed to set thumbnail")
    } finally {
      setIsSettingThumbnail(null)
    }
  }

  const handleDeleteImage = async (image: EntityImage) => {
    setIsDeletingImage(image.id)
    try {
      await deleteEntityImage({
        data: { entityType, imageId: image.id, storagePath: image.storagePath },
      })
      onImagesChange()
    } catch {
      toast.error("Failed to delete image")
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
        {images.length > 0 && <div className={cn("grid grid-cols-2 gap-4", !imageAction && "sm:grid-cols-3")}>
          {images.map((image, index) => (
            <div key={image.id} className="group relative">
              <ResilientImage
                src={thumbnailUrl(image.storagePath)}
                alt={`${entityType === "beans" ? "Bean" : "Gear"} picture ${index + 1}`}
                loading="lazy"
                decoding="async"
                width={640}
                height={640}
                className="aspect-square w-full rounded-lg object-cover"
              />
              {!readOnly && (
                <div className="absolute inset-0 rounded-lg opacity-100 transition-colors [@media(hover:hover)]:group-hover:bg-foreground/55">
                  {imageAction && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 left-2 h-11 px-3 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 [@media(hover:hover)]:h-8"
                      onClick={() => imageAction.onSelect(image)}
                      disabled={imageAction.disabled || imageAction.pendingImageId !== null}
                      aria-label={imageAction.pendingImageId === image.id
                        ? `${imageAction.label} using picture ${index + 1}, in progress`
                        : `${imageAction.label} using picture ${index + 1}`}
                      aria-busy={imageAction.pendingImageId === image.id}
                      title={imageAction.label}
                    >
                      {imageAction.pendingImageId === image.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {imageAction.pendingImageId === image.id ? "Filling…" : "Fill"}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant={image.isThumbnail ? "default" : "secondary"}
                    className="absolute left-2 top-2 h-11 w-11 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary sm:h-11 sm:w-11 [@media(hover:hover)]:h-8 [@media(hover:hover)]:w-8"
                    onClick={() => handleSetThumbnail(image.id)}
                    disabled={isSettingThumbnail === image.id || image.isThumbnail}
                    aria-label={image.isThumbnail ? "Current thumbnail" : `Set picture ${index + 1} as thumbnail`}
                    title={image.isThumbnail ? "Current thumbnail" : "Set as thumbnail"}
                  >
                    <Star className={cn("h-4 w-4", image.isThumbnail && "fill-current")} />
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
                        <AlertDialogTitle>Delete this picture?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteImage(image)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>}
        {imageAction?.pendingImageId !== null && imageAction?.pendingImageId !== undefined && (
          <span className="sr-only" role="status">
            {imageAction.label} in progress
          </span>
        )}
        {!readOnly && (
          <ImageUploadField
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
            onRemoveImage={removeImage}
            onOpenFilePicker={openFilePicker}
            prompt={entityType === "beans" ? "Add more bean pictures" : "Add more equipment pictures"}
            previewAltPrefix={entityType === "beans" ? "Bean" : "Gear"}
            isBusy={isUploading}
            statusText={isUploading ? "Uploading pictures" : undefined}
            helperText={isUploading ? "Uploading pictures…" : "New pictures upload immediately"}
          />
        )}
      </CardContent>
    </Card>
  )
}
