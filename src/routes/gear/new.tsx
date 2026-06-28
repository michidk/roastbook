import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createGear } from "@/lib/server/gear"
import { uploadEntityImage } from "@/lib/server/images"
import { useImageUpload } from "@/hooks/useImageUpload"
import { InputField, SelectField, TextareaField } from "@/components/FormField"
import { ImageUploadField } from "@/components/image-upload-field"
import { GEAR_TYPES, type GearType } from "@/lib/constants"

export const Route = createFileRoute("/gear/new")({
  component: NewGearPage,
})

function NewGearPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { images, fileInputRef, handleImageSelect, removeImage, openFilePicker } = useImageUpload()

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    model: "",
    type: "" as GearType | "",
    purchaseDate: "",
    purchasePrice: "",
    priceCurrency: "EUR",
    manualUrl: "",
    productUrl: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.type) return

    setIsSubmitting(true)

    try {
      const item = await createGear({
        data: {
          name: formData.name,
          brand: formData.brand || undefined,
          model: formData.model || undefined,
          type: formData.type,
          purchaseDate: formData.purchaseDate
            ? new Date(formData.purchaseDate)
            : undefined,
          purchasePrice: formData.purchasePrice || undefined,
          priceCurrency: formData.priceCurrency || undefined,
          manualUrl: formData.manualUrl || undefined,
          productUrl: formData.productUrl || undefined,
          notes: formData.notes || undefined,
        },
      })

      for (const image of images) {
        await uploadEntityImage({
          data: {
            entityType: "gear",
            entityId: item.id,
            fileBase64: image.base64,
            filename: image.file.name,
            mimeType: image.file.type,
            sizeBytes: image.file.size,
          },
        })
      }

      navigate({ to: "/gear/$gearId", params: { gearId: String(item.id) } })
    } catch {
      toast.error("Could not save this gear")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Gear</h1>
        <p className="text-muted-foreground">
          Add new equipment to your setup
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploadField
              images={images}
              fileInputRef={fileInputRef}
              onImageSelect={handleImageSelect}
              onRemoveImage={removeImage}
              onOpenFilePicker={openFilePicker}
              prompt="Click to add photos of your equipment"
              previewAltPrefix="Gear"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipment Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="name"
                label="Name"
                placeholder="e.g., My Grinder"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />
              <SelectField
                id="type"
                label="Type"
                placeholder="Select type"
                value={formData.type}
                onChange={(value) =>
                  setFormData({ ...formData, type: value as GearType | "" })
                }
                options={GEAR_TYPES}
                required
              />
              <InputField
                id="brand"
                label="Brand"
                placeholder="e.g., Niche"
                value={formData.brand}
                onChange={(value) => setFormData({ ...formData, brand: value })}
              />
              <InputField
                id="model"
                label="Model"
                placeholder="e.g., Zero"
                value={formData.model}
                onChange={(value) => setFormData({ ...formData, model: value })}
              />
            </div>
            <TextareaField
              id="notes"
              label="Notes"
              placeholder="Any additional info about this equipment"
              value={formData.notes}
              onChange={(value) => setFormData({ ...formData, notes: value })}
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InputField
                id="purchaseDate"
                label="Purchase Date"
                type="date"
                value={formData.purchaseDate}
                onChange={(value) => setFormData({ ...formData, purchaseDate: value })}
              />
              <InputField
                id="purchasePrice"
                label="Price"
                type="number"
                placeholder="e.g., 599.00"
                value={formData.purchasePrice}
                onChange={(value) => setFormData({ ...formData, purchasePrice: value })}
                step="0.01"
                min="0"
              />
              <InputField
                id="priceCurrency"
                label="Currency"
                placeholder="EUR"
                value={formData.priceCurrency}
                onChange={(value) => setFormData({ ...formData, priceCurrency: value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputField
              id="productUrl"
              label="Product Page"
              type="url"
              placeholder="https://..."
              value={formData.productUrl}
              onChange={(value) => setFormData({ ...formData, productUrl: value })}
            />
            <InputField
              id="manualUrl"
              label="Manual / Documentation"
              type="url"
              placeholder="https://..."
              value={formData.manualUrl}
              onChange={(value) => setFormData({ ...formData, manualUrl: value })}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/gear" })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.name.trim() || !formData.type}
            className="flex-1"
          >
            {isSubmitting ? "Saving..." : "Add Gear"}
          </Button>
        </div>
      </form>
    </div>
  )
}
