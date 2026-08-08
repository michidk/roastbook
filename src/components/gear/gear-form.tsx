import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { EntityForm, FormActions, FormSection } from "@/components/form/form-shell"
import {
  CurrencyField,
  InputField,
  SelectField,
  TextareaField,
} from "@/components/form/form-field"
import { ImageUploadField } from "@/components/image-upload-field"
import { useFormState } from "@/hooks/use-form-state"
import { useImageUpload } from "@/hooks/useImageUpload"
import { createGear } from "@/lib/server/gear"
import { uploadEntityImage } from "@/lib/server/images"
import { GEAR_TYPES, type GearType } from "@/lib/constants"

type CreatedGear = Awaited<ReturnType<typeof createGear>>

interface GearFormProps {
  onCreated: (gear: CreatedGear) => void | Promise<void>
  onCancel: () => void
  initialName?: string
  submitLabel?: string
}

export function GearForm({
  onCreated,
  onCancel,
  initialName = "",
  submitLabel = "Add Gear",
}: GearFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { images, fileInputRef, handleImageSelect, removeImage, openFilePicker } =
    useImageUpload()

  const form = useFormState({
    name: initialName,
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

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.values.name.trim() || !form.values.type) return

    setIsSubmitting(true)

    try {
      const item = await createGear({
        data: {
          name: form.values.name,
          brand: form.values.brand || undefined,
          model: form.values.model || undefined,
          type: form.values.type,
          purchaseDate: form.values.purchaseDate
            ? new Date(form.values.purchaseDate)
            : undefined,
          purchasePrice: form.values.purchasePrice || undefined,
          priceCurrency: form.values.priceCurrency || undefined,
          manualUrl: form.values.manualUrl || undefined,
          productUrl: form.values.productUrl || undefined,
          notes: form.values.notes || undefined,
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

      await onCreated(item)
    } catch {
      toast.error("Could not save this gear")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit}>
      <FormSection title="Photos">
        <ImageUploadField
          images={images}
          fileInputRef={fileInputRef}
          onImageSelect={handleImageSelect}
          onRemoveImage={removeImage}
          onOpenFilePicker={openFilePicker}
          prompt="Click to add photos of your equipment"
          previewAltPrefix="Gear"
        />
      </FormSection>

      <FormSection title="Equipment Info">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="gear-name"
            label="Name"
            placeholder="e.g., My Grinder"
            value={form.values.name}
            onChange={form.setField("name")}
            required
          />
          <SelectField
            id="gear-type"
            label="Type"
            placeholder="Select type"
            value={form.values.type}
            onChange={(value) => form.set("type", value as GearType | "")}
            options={GEAR_TYPES}
            required
          />
          <InputField
            id="gear-brand"
            label="Brand"
            placeholder="e.g., Niche"
            value={form.values.brand}
            onChange={form.setField("brand")}
          />
          <InputField
            id="gear-model"
            label="Model"
            placeholder="e.g., Zero"
            value={form.values.model}
            onChange={form.setField("model")}
          />
        </div>
        <TextareaField
          id="gear-notes"
          label="Notes"
          placeholder="Any additional info about this equipment"
          value={form.values.notes}
          onChange={form.setField("notes")}
          rows={3}
        />
      </FormSection>

      <FormSection title="Purchase Info">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InputField
            id="gear-purchaseDate"
            label="Purchase Date"
            type="date"
            value={form.values.purchaseDate}
            onChange={form.setField("purchaseDate")}
          />
          <InputField
            id="gear-purchasePrice"
            label="Price"
            type="number"
            placeholder="e.g., 599.00"
            value={form.values.purchasePrice}
            onChange={form.setField("purchasePrice")}
            step="0.01"
            min="0"
          />
          <CurrencyField
            id="gear-priceCurrency"
            value={form.values.priceCurrency}
            onChange={form.setField("priceCurrency")}
          />
        </div>
      </FormSection>

      <FormSection title="Links">
        <InputField
          id="gear-productUrl"
          label="Product Page"
          type="url"
          placeholder="https://..."
          value={form.values.productUrl}
          onChange={form.setField("productUrl")}
        />
        <InputField
          id="gear-manualUrl"
          label="Manual / Documentation"
          type="url"
          placeholder="https://..."
          value={form.values.manualUrl}
          onChange={form.setField("manualUrl")}
        />
      </FormSection>

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        disabled={!form.values.name.trim() || !form.values.type}
        submitLabel={submitLabel}
      />
    </EntityForm>
  )
}
