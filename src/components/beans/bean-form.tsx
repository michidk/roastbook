import { useEffect, useState, type SyntheticEvent } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EntityForm, FormActions, FormSection } from "@/components/form/form-shell"
import {
  CurrencyField,
  InputField,
  SelectField,
  TextareaField,
} from "@/components/form/form-field"
import { ImageUploadField } from "@/components/image-upload-field"
import {
  RoasterPicker,
  type RoasterOption,
} from "@/components/roasters/roaster-picker"
import { useFormState } from "@/hooks/use-form-state"
import { useImageUpload } from "@/hooks/useImageUpload"
import { checkVisionEnabled, createBean, extractBeanInfo } from "@/lib/server/beans"
import { uploadEntityImage } from "@/lib/server/images"
import { getRoasters } from "@/lib/server/roasters"
import { PROCESS_METHODS, ROAST_LEVELS, type RoastLevel } from "@/lib/constants"

type CreatedBean = Awaited<ReturnType<typeof createBean>>

interface BeanFormProps {
  onCreated: (bean: CreatedBean) => void | Promise<void>
  onCancel: () => void
  initialName?: string
  submitLabel?: string
  roasters?: readonly RoasterOption[]
}

export function BeanForm({
  onCreated,
  onCancel,
  initialName = "",
  submitLabel = "Add Beans",
  roasters,
}: BeanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [visionEnabled, setVisionEnabled] = useState(false)
  const [loadedRoasters, setLoadedRoasters] = useState<readonly RoasterOption[]>(
    []
  )
  const { images, fileInputRef, handleImageSelect, removeImage, openFilePicker } =
    useImageUpload()

  const form = useFormState({
    name: initialName,
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

  useEffect(() => {
    if (roasters) return
    getRoasters().then(setLoadedRoasters)
  }, [roasters])

  const roasterOptions = roasters ?? loadedRoasters

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
        ? roasterOptions.find((roaster) =>
            roaster.name.toLowerCase().includes(extracted.roaster!.toLowerCase())
          )
        : null

      form.setValues((current) => ({
        ...current,
        name: extracted.name || current.name,
        roasterId: matchedRoaster ? String(matchedRoaster.id) : current.roasterId,
        origin: extracted.origin || current.origin,
        region: extracted.region || current.region,
        farm: extracted.farm || current.farm,
        variety: extracted.variety || current.variety,
        process: extracted.process || current.process,
        roastLevel: extracted.roastLevel || current.roastLevel,
        roastDate: extracted.roastDate || current.roastDate,
        notes: extracted.notes || current.notes,
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to extract bean info"
      toast.error(message)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.values.name.trim()) return

    setIsSubmitting(true)

    try {
      const bean = await createBean({
        data: {
          name: form.values.name,
          roasterId: form.values.roasterId
            ? Number(form.values.roasterId)
            : undefined,
          weight: form.values.weight || undefined,
          price: form.values.price || undefined,
          priceCurrency: form.values.priceCurrency || undefined,
          shopUrl: form.values.shopUrl || undefined,
          origin: form.values.origin || undefined,
          region: form.values.region || undefined,
          farm: form.values.farm || undefined,
          variety: form.values.variety || undefined,
          process: form.values.process || undefined,
          roastLevel: form.values.roastLevel || undefined,
          roastDate: form.values.roastDate
            ? new Date(form.values.roastDate)
            : undefined,
          notes: form.values.notes || undefined,
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

      await onCreated(bean)
    } catch {
      toast.error("Could not save these beans")
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
          prompt="Click to add photos of the coffee bag"
          previewAltPrefix="Bean"
          helperText={
            visionEnabled
              ? "AI can extract bean info from your photos"
              : undefined
          }
          footer={
            visionEnabled ? (
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
            ) : undefined
          }
        />
      </FormSection>

      <FormSection title="Basic Info">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="bean-name"
            label="Name"
            placeholder="e.g., Ethiopia Yirgacheffe"
            value={form.values.name}
            onChange={form.setField("name")}
            required
          />
          <RoasterPicker
            id="bean-roasterId"
            label="Roaster"
            value={form.values.roasterId}
            onChange={form.setField("roasterId")}
            roasters={roasterOptions}
          />
          <InputField
            id="bean-weight"
            label="Bag Weight (g)"
            type="number"
            placeholder="e.g., 250"
            value={form.values.weight}
            onChange={form.setField("weight")}
          />
          <div className="flex gap-2">
            <InputField
              id="bean-price"
              label="Price"
              type="number"
              step="0.01"
              placeholder="e.g., 15.00"
              value={form.values.price}
              onChange={form.setField("price")}
              className="flex-1"
            />
            <CurrencyField
              id="bean-priceCurrency"
              value={form.values.priceCurrency}
              onChange={form.setField("priceCurrency")}
              className="w-28"
            />
          </div>
          <InputField
            id="bean-shopUrl"
            label="Shop URL"
            type="url"
            placeholder="https://..."
            value={form.values.shopUrl}
            onChange={form.setField("shopUrl")}
          />
        </div>
      </FormSection>

      <FormSection title="Origin">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="bean-origin"
            label="Country"
            placeholder="e.g., Ethiopia"
            value={form.values.origin}
            onChange={form.setField("origin")}
          />
          <InputField
            id="bean-region"
            label="Region"
            placeholder="e.g., Yirgacheffe"
            value={form.values.region}
            onChange={form.setField("region")}
          />
          <InputField
            id="bean-farm"
            label="Farm/Producer"
            placeholder="e.g., Konga Cooperative"
            value={form.values.farm}
            onChange={form.setField("farm")}
          />
          <InputField
            id="bean-variety"
            label="Variety"
            placeholder="e.g., Heirloom"
            value={form.values.variety}
            onChange={form.setField("variety")}
          />
        </div>
      </FormSection>

      <FormSection title="Processing">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <SelectField
            id="bean-process"
            label="Process"
            placeholder="Select process"
            value={form.values.process}
            onChange={form.setField("process")}
            options={PROCESS_METHODS}
          />
          <SelectField
            id="bean-roastLevel"
            label="Roast Level"
            placeholder="Select level"
            value={form.values.roastLevel}
            onChange={(value) =>
              form.set("roastLevel", value as RoastLevel | "")
            }
            options={ROAST_LEVELS}
          />
          <InputField
            id="bean-roastDate"
            label="Roast Date"
            type="date"
            value={form.values.roastDate}
            onChange={form.setField("roastDate")}
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id="bean-notes"
          label="Notes"
          placeholder="Tasting notes, brewing tips, or other observations"
          value={form.values.notes}
          onChange={form.setField("notes")}
          rows={4}
        />
      </FormSection>

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        disabled={!form.values.name.trim()}
        submitLabel={submitLabel}
      />
    </EntityForm>
  )
}
