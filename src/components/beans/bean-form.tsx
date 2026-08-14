import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  beanCreatePayload,
  createEmptyBeanFormValues,
} from '@/components/beans/bean-form-values'
import { EntityImageUploadSection } from '@/components/form/entity-image-upload-section'
import {
  CurrencyField,
  InputField,
  SelectField,
  TextareaField,
} from '@/components/form/form-field'
import { EntityForm, FormSection } from '@/components/form/form-shell'
import {
  type RoasterOption,
  RoasterPicker,
} from '@/components/roasters/roaster-picker'
import { Button } from '@/components/ui/button'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useImageUpload } from '@/hooks/useImageUpload'
import {
  BEAN_TYPES,
  type BeanType,
  PROCESS_METHODS,
  ROAST_LEVELS,
  type RoastLevel,
} from '@/lib/constants'
import { getErrorMessage } from '@/lib/error-message'
import {
  checkVisionEnabled,
  createBean,
  extractBeanInfo,
} from '@/lib/server/beans'
import { getRoasters } from '@/lib/server/roasters'
import { uploadEntityImages } from '@/lib/upload-entity-images'

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
  initialName = '',
  submitLabel = 'Add beans',
  roasters,
}: BeanFormProps) {
  const { defaultCurrency } = useAppSettings()
  const [isExtracting, setIsExtracting] = useState(false)
  const [visionEnabled, setVisionEnabled] = useState(false)
  const [loadedRoasters, setLoadedRoasters] = useState<
    readonly RoasterOption[]
  >([])
  const imageUpload = useImageUpload()
  const { images } = imageUpload

  const form = useFormState(createEmptyBeanFormValues(initialName))

  useEffect(() => {
    form.set('priceCurrency', defaultCurrency)
  }, [defaultCurrency, form.set])

  useEffect(() => {
    let active = true
    void checkVisionEnabled()
      .then((result) => {
        if (active) setVisionEnabled(result.enabled)
      })
      .catch(() => {
        if (active) setVisionEnabled(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (roasters) return
    let active = true
    void getRoasters()
      .then((result) => {
        if (active) setLoadedRoasters(result)
      })
      .catch((error) => {
        if (active) {
          toast.error(getErrorMessage(error, 'Could not load roasters'))
        }
      })
    return () => {
      active = false
    }
  }, [roasters])

  const roasterOptions = roasters ?? loadedRoasters

  const handleFillWithAI = async () => {
    if (images.length === 0) return

    setIsExtracting(true)
    try {
      const firstImage = images[0]
      if (!firstImage) return
      const extracted = await extractBeanInfo({
        data: {
          imageBase64: firstImage.base64,
          mimeType: firstImage.file.type,
        },
      })

      const extractedRoaster = extracted.roaster
      const matchedRoaster = extractedRoaster
        ? roasterOptions.find((roaster) =>
            roaster.name.toLowerCase().includes(extractedRoaster.toLowerCase()),
          )
        : null

      form.setValues((current) => ({
        ...current,
        name: extracted.name || current.name,
        type: extracted.type || current.type,
        roasterId: matchedRoaster
          ? String(matchedRoaster.id)
          : current.roasterId,
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
      toast.error(getErrorMessage(error, 'Failed to extract bean info'))
    } finally {
      setIsExtracting(false)
    }
  }

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(form.values.name.trim()),
    submit: async () => {
      const bean = await createBean({
        data: beanCreatePayload(form.values),
      })

      const uploadResult = await uploadEntityImages('beans', bean.id, images)
      if (uploadResult.failures.length > 0) {
        toast.warning(
          `Beans saved, but ${uploadResult.failures.length} ${uploadResult.failures.length === 1 ? 'picture' : 'pictures'} could not be uploaded`,
        )
      }
      await onCreated(bean)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not save these beans')),
  })

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel,
        isSubmitting,
        disabled: !form.values.name.trim(),
        submitLabel,
      }}
    >
      <EntityImageUploadSection
        upload={imageUpload}
        prompt="Add pictures of the coffee bag"
        previewAltPrefix="Bean"
        isBusy={isSubmitting}
        statusText={isSubmitting ? 'Saving bean pictures' : undefined}
        helperText={
          visionEnabled
            ? 'AI can extract bean info from your pictures'
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

      <FormSection title="Basic info">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="bean-name"
            label="Name"
            placeholder="e.g., Ethiopia Yirgacheffe"
            value={form.values.name}
            onChange={form.setField('name')}
            required
          />
          <RoasterPicker
            id="bean-roasterId"
            label="Roaster"
            value={form.values.roasterId}
            onChange={form.setField('roasterId')}
            roasters={roasterOptions}
          />
          <SelectField
            id="bean-type"
            label="Type"
            placeholder="Select type"
            value={form.values.type}
            onChange={(value) => form.set('type', value as BeanType | '')}
            options={BEAN_TYPES}
          />
          <InputField
            id="bean-weight"
            label="Bag weight (g)"
            type="number"
            min="0"
            step="50"
            placeholder="e.g., 250"
            value={form.values.weight}
            onChange={form.setField('weight')}
          />
          <div className="flex gap-2">
            <InputField
              id="bean-price"
              label="Price"
              type="number"
              min="0"
              step="1"
              placeholder="e.g., 15.00"
              value={form.values.price}
              onChange={form.setField('price')}
              className="flex-1"
            />
            <CurrencyField
              id="bean-priceCurrency"
              value={form.values.priceCurrency}
              onChange={form.setField('priceCurrency')}
              className="w-28"
            />
          </div>
          <InputField
            id="bean-shopUrl"
            label="Shop URL"
            type="url"
            placeholder="https://…"
            value={form.values.shopUrl}
            onChange={form.setField('shopUrl')}
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
            onChange={form.setField('origin')}
          />
          <InputField
            id="bean-region"
            label="Region"
            placeholder="e.g., Yirgacheffe"
            value={form.values.region}
            onChange={form.setField('region')}
          />
          <InputField
            id="bean-farm"
            label="Farm/Producer"
            placeholder="e.g., Konga Cooperative"
            value={form.values.farm}
            onChange={form.setField('farm')}
          />
          <InputField
            id="bean-variety"
            label="Variety"
            placeholder="e.g., Heirloom"
            value={form.values.variety}
            onChange={form.setField('variety')}
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
            onChange={form.setField('process')}
            options={PROCESS_METHODS}
          />
          <SelectField
            id="bean-roastLevel"
            label="Roast level"
            placeholder="Select level"
            value={form.values.roastLevel}
            onChange={(value) =>
              form.set('roastLevel', value as RoastLevel | '')
            }
            options={ROAST_LEVELS}
          />
          <InputField
            id="bean-roastDate"
            label="Roast date"
            type="date"
            value={form.values.roastDate}
            onChange={form.setField('roastDate')}
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id="bean-notes"
          label="Notes"
          placeholder="Tasting notes, brewing tips, or other observations"
          value={form.values.notes}
          onChange={form.setField('notes')}
          rows={4}
        />
      </FormSection>
    </EntityForm>
  )
}
