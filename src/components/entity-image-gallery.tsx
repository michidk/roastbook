import { useState } from "react"
import { Star, Trash2 } from "lucide-react"
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

interface EntityImage {
  id: number
  storagePath: string
  isThumbnail: boolean
}

interface EntityImageGalleryProps {
  entityType: "beans" | "gear"
  entityId: number
  images: EntityImage[]
  onImagesChange: () => void
  readOnly?: boolean
}

export function EntityImageGallery({
  entityType,
  entityId,
  images,
  onImagesChange,
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
        {images.length > 0 && <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="group relative">
              <ResilientImage
                src={thumbnailUrl(image.storagePath)}
                alt=""
                loading="lazy"
                decoding="async"
                width={640}
                height={640}
                className="aspect-square w-full rounded-lg object-cover"
              />
              {!readOnly && (
                <div className="absolute inset-0 flex items-start justify-end gap-2 rounded-lg p-2 opacity-100 transition-opacity [@media(hover:hover)]:items-center [@media(hover:hover)]:justify-center [@media(hover:hover)]:bg-black/50 [@media(hover:hover)]:p-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant={image.isThumbnail ? "default" : "secondary"}
                    className="h-11 w-11 [@media(hover:hover)]:h-8 [@media(hover:hover)]:w-8"
                    onClick={() => handleSetThumbnail(image.id)}
                    disabled={isSettingThumbnail === image.id || image.isThumbnail}
                    title={image.isThumbnail ? "Current thumbnail" : "Set as thumbnail"}
                  >
                    <Star className={cn("h-4 w-4", image.isThumbnail && "fill-current")} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-11 w-11 [@media(hover:hover)]:h-8 [@media(hover:hover)]:w-8"
                        disabled={isDeletingImage === image.id}
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
            helperText={isUploading ? "Uploading pictures…" : "New pictures upload immediately"}
          />
        )}
      </CardContent>
    </Card>
  )
}
