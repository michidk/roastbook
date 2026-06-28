import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createBean,
  checkVisionEnabled,
  extractBeanInfo,
} from "@/lib/server/beans"
import { getRoasters } from "@/lib/server/roasters"
import { uploadEntityImage } from "@/lib/server/images"
import { useImageUpload } from "@/hooks/useImageUpload"
import { InputField, SelectField, TextareaField } from "@/components/FormField"
import { ImageUploadField } from "@/components/image-upload-field"
import { Sparkles, Loader2 } from "lucide-react"
import { ROAST_LEVELS, PROCESS_METHODS, type RoastLevel } from "@/lib/constants"

export const Route = createFileRoute("/beans/new")({
  loader: () => getRoasters(),
  component: NewBeanPage,
})

function NewBeanPage() {
  const roasters = Route.useLoaderData()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [visionEnabled, setVisionEnabled] = useState(false)
  const { images, fileInputRef, handleImageSelect, removeImage, openFilePicker } = useImageUpload()

  const roasterOptions = roasters.map((r) => ({ value: String(r.id), label: r.name }))

  const [formData, setFormData] = useState({
    name: "",
    roasterId: "",
    weight: "",
    price: "",
    priceCurrency: "EUR",
    shopUrl: "",
    origin: "",
    region: "",
    farm: "",
    variety: "",
    process: "",
    roastLevel: "" as RoastLevel | "",
    roastDate: "",
    notes: "",
  })

  useEffect(() => {
    checkVisionEnabled().then((result) => setVisionEnabled(result.enabled))
  }, [])

  const handleFillWithAI = async () => {
    if (images.length === 0) return

    setIsExtracting(true)
    try {
      const firstImage = images[0]
      const extracted = await extractBeanInfo({
        data: {
          imageBase64: firstImage.base64,
          mimeType: firstImage.file.type,
        },
      })

      const matchedRoaster = extracted.roaster
        ? roasters.find((r) => r.name.toLowerCase().includes(extracted.roaster!.toLowerCase()))
        : null

      setFormData((prev) => ({
        ...prev,
        name: extracted.name || prev.name,
        roasterId: matchedRoaster ? String(matchedRoaster.id) : prev.roasterId,
        origin: extracted.origin || prev.origin,
        region: extracted.region || prev.region,
        farm: extracted.farm || prev.farm,
        variety: extracted.variety || prev.variety,
        process: extracted.process || prev.process,
        roastLevel: extracted.roastLevel || prev.roastLevel,
        roastDate: extracted.roastDate || prev.roastDate,
        notes: extracted.notes || prev.notes,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to extract bean info"
      toast.error(message)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)

    try {
      const bean = await createBean({
        data: {
          name: formData.name,
          roasterId: formData.roasterId ? Number(formData.roasterId) : undefined,
          weight: formData.weight || undefined,
          price: formData.price || undefined,
          priceCurrency: formData.priceCurrency || undefined,
          shopUrl: formData.shopUrl || undefined,
          origin: formData.origin || undefined,
          region: formData.region || undefined,
          farm: formData.farm || undefined,
          variety: formData.variety || undefined,
          process: formData.process || undefined,
          roastLevel: formData.roastLevel || undefined,
          roastDate: formData.roastDate ? new Date(formData.roastDate) : undefined,
          notes: formData.notes || undefined,
        },
      })

      for (const image of images) {
        await uploadEntityImage({
          data: {
            entityType: "beans",
            entityId: bean.id,
            fileBase64: image.base64,
            filename: image.file.name,
            mimeType: image.file.type,
            sizeBytes: image.file.size,
          },
        })
      }

      navigate({ to: "/beans/$beanId", params: { beanId: String(bean.id) } })
    } catch {
      toast.error("Could not save these beans")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Beans</h1>
        <p className="text-muted-foreground">
          Add a new bag of coffee to your collection
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
              prompt="Click to add photos of the coffee bag"
              previewAltPrefix="Bean"
              helperText={visionEnabled ? "AI can extract bean info from your photos" : undefined}
              footer={visionEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleFillWithAI}
                  disabled={isExtracting || images.length === 0}
                >
                  {isExtracting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Fill using AI
                </Button>
              ) : undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="name"
                label="Name"
                placeholder="e.g., Ethiopia Yirgacheffe"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />
              <SelectField
                id="roasterId"
                label="Roaster"
                placeholder="Select roaster"
                value={formData.roasterId}
                onChange={(value) => setFormData({ ...formData, roasterId: value ?? "" })}
                options={roasterOptions}
              />
              <InputField
                id="weight"
                label="Bag Weight (g)"
                type="number"
                placeholder="e.g., 250"
                value={formData.weight}
                onChange={(value) => setFormData({ ...formData, weight: value })}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputField
                    id="price"
                    label="Price"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 15.00"
                    value={formData.price}
                    onChange={(value) => setFormData({ ...formData, price: value })}
                  />
                </div>
                <div className="w-24">
                  <InputField
                    id="priceCurrency"
                    label="Currency"
                    placeholder="EUR"
                    value={formData.priceCurrency}
                    onChange={(value) => setFormData({ ...formData, priceCurrency: value })}
                  />
                </div>
              </div>
              <InputField
                id="shopUrl"
                label="Shop URL"
                type="url"
                placeholder="https://..."
                value={formData.shopUrl}
                onChange={(value) => setFormData({ ...formData, shopUrl: value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="origin"
                label="Country"
                placeholder="e.g., Ethiopia"
                value={formData.origin}
                onChange={(value) => setFormData({ ...formData, origin: value })}
              />
              <InputField
                id="region"
                label="Region"
                placeholder="e.g., Yirgacheffe"
                value={formData.region}
                onChange={(value) => setFormData({ ...formData, region: value })}
              />
              <InputField
                id="farm"
                label="Farm/Producer"
                placeholder="e.g., Konga Cooperative"
                value={formData.farm}
                onChange={(value) => setFormData({ ...formData, farm: value })}
              />
              <InputField
                id="variety"
                label="Variety"
                placeholder="e.g., Heirloom"
                value={formData.variety}
                onChange={(value) => setFormData({ ...formData, variety: value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <SelectField
                id="process"
                label="Process"
                placeholder="Select process"
                value={formData.process}
                onChange={(value) => setFormData({ ...formData, process: value })}
                options={PROCESS_METHODS}
              />
              <SelectField
                id="roastLevel"
                label="Roast Level"
                placeholder="Select level"
                value={formData.roastLevel}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    roastLevel: value as RoastLevel | "",
                  })
                }
                options={ROAST_LEVELS}
              />
              <InputField
                id="roastDate"
                label="Roast Date"
                type="date"
                value={formData.roastDate}
                onChange={(value) => setFormData({ ...formData, roastDate: value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <TextareaField
              id="notes"
              label="Notes"
              placeholder="Tasting notes, brewing tips, or other observations"
              value={formData.notes}
              onChange={(value) => setFormData({ ...formData, notes: value })}
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/beans" })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !formData.name.trim()} className="flex-1">
            {isSubmitting ? "Saving..." : "Add Beans"}
          </Button>
        </div>
      </form>
    </div>
  )
}
