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

interface EntityImage {
  id: number
  storagePath: string
  isThumbnail: boolean
}

interface EntityImageGalleryProps {
  entityType: "beans" | "gear"
  entityId: number
  images: EntityImage[]
  baseUrl: string
  onImagesChange: () => void
  readOnly?: boolean
}

export function EntityImageGallery({
  entityType,
  entityId,
  images,
  baseUrl,
  onImagesChange,
  readOnly = false,
}: EntityImageGalleryProps) {
  const [isSettingThumbnail, setIsSettingThumbnail] = useState<number | null>(null)
  const [isDeletingImage, setIsDeletingImage] = useState<number | null>(null)

  if (images.length === 0) return null

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
        <CardTitle>Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="group relative">
              <img
                src={thumbnailUrl(baseUrl, image.storagePath)}
                alt=""
                loading="lazy"
                decoding="async"
                width={640}
                height={640}
                className="aspect-square w-full rounded-lg object-cover"
              />
              {!readOnly && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant={image.isThumbnail ? "default" : "secondary"}
                    className="h-8 w-8"
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
                        className="h-8 w-8"
                        disabled={isDeletingImage === image.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
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
        </div>
      </CardContent>
    </Card>
  )
}
