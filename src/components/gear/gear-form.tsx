import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EntityImageUploadSection } from '@/components/form/entity-image-upload-section'
import {
  CurrencyField,
  InputField,
  SelectField,
  TextareaField,
} from '@/components/form/form-field'
import { EntityForm, FormSection } from '@/components/form/form-shell'
import {
  EMPTY_GEAR_SUBTYPE_VALUES,
  GearSubtypeFields,
} from '@/components/gear/gear-subtype-fields'
import { MachineSettingsDiffModal } from '@/components/gear/machine-settings-diff-modal'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useImageUpload } from '@/hooks/useImageUpload'
import type { ExtractedMachineSettings } from '@/lib/ai'
import {
  GEAR_TYPES,
  type GearType,
  isEspressoMachineGearType,
} from '@/lib/constants'
import {
  checkGearResearchEnabled,
  createGear,
  researchMachineSettings,
} from '@/lib/server/gear'
import { uploadEntityImages } from '@/lib/upload-entity-images'

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
  initialName = '',
  submitLabel = 'Add gear',
}: GearFormProps) {
  const { defaultCurrency } = useAppSettings()
  const [subtype, setSubtype] = useState(EMPTY_GEAR_SUBTYPE_VALUES)
  const [researchEnabled, setResearchEnabled] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchModalOpen, setResearchModalOpen] = useState(false)
  const [researchedSettings, setResearchedSettings] =
    useState<ExtractedMachineSettings | null>(null)
  const imageUpload = useImageUpload()
  const { images } = imageUpload

  const form = useFormState({
    name: initialName,
    brand: '',
    model: '',
    type: '' as GearType | '',
    purchaseDate: '',
    purchasePrice: '',
    priceCurrency: 'EUR',
    manualUrl: '',
    productUrl: '',
    notes: '',
  })

  useEffect(() => {
    form.set('priceCurrency', defaultCurrency)
  }, [defaultCurrency, form.set])

  useEffect(() => {
    let active = true
    void checkGearResearchEnabled()
      .then(({ enabled }) => {
        if (active) setResearchEnabled(enabled)
      })
      .catch(() => {
        if (active) setResearchEnabled(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleResearch = async () => {
    const name = form.values.name.trim()
    const brand = form.values.brand.trim()
    const model = form.values.model.trim()
    if (!name || !brand || !model) {
      toast.error('Enter the machine name, brand, and model first')
      return
    }

    setIsResearching(true)
    try {
      const result = await researchMachineSettings({
        data: {
          name,
          brand,
          model,
        },
      })
      if (Object.keys(result).length === 0) {
        toast.error('No documented machine settings found')
        return
      }
      setResearchedSettings(result)
      setResearchModalOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Research failed')
    } finally {
      setIsResearching(false)
    }
  }

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(form.values.name.trim() && form.values.type),
    submit: async () => {
      const type = form.values.type
      if (!type) throw new Error('Gear type is required')

      const item = await createGear({
        data: {
          name: form.values.name,
          brand: form.values.brand || undefined,
          model: form.values.model || undefined,
          type,
          purchaseDate: form.values.purchaseDate
            ? new Date(form.values.purchaseDate)
            : undefined,
          purchasePrice: form.values.purchasePrice || undefined,
          priceCurrency: form.values.priceCurrency || undefined,
          manualUrl: form.values.manualUrl || undefined,
          productUrl: form.values.productUrl || undefined,
          notes: form.values.notes || undefined,
          machineSettings: isEspressoMachineGearType(type)
            ? {
                brewPressureOpvBar: subtype.brewPressureOpvBar || null,
                supportsPreinfusion:
                  subtype.supportsPreinfusion === ''
                    ? null
                    : subtype.supportsPreinfusion === 'true',
                defaultPreinfusionEnabled:
                  subtype.defaultPreinfusionEnabled === ''
                    ? null
                    : subtype.defaultPreinfusionEnabled === 'true',
                defaultPreinfusionTimeSeconds:
                  subtype.defaultPreinfusionTimeSeconds || null,
                defaultPreinfusionPressureBar:
                  subtype.defaultPreinfusionPressureBar || null,
                defaultFlowLimitMlPerSecond:
                  subtype.defaultFlowLimitMlPerSecond || null,
                temperatureOffsetCelsius:
                  subtype.temperatureOffsetCelsius || null,
                volumetricShotVolumeMl: subtype.volumetricShotVolumeMl || null,
                autoStopMode:
                  subtype.autoStopMode === 'manual' ||
                  subtype.autoStopMode === 'weight' ||
                  subtype.autoStopMode === 'time' ||
                  subtype.autoStopMode === 'volume'
                    ? subtype.autoStopMode
                    : null,
                steamTemperatureCelsius:
                  subtype.steamTemperatureCelsius || null,
                steamPressureBar: subtype.steamPressureBar || null,
              }
            : null,
          basketDetails:
            type === 'basket'
              ? { nominalDoseGrams: subtype.nominalDoseGrams || null }
              : null,
        },
      })

      await uploadEntityImages('gear', item.id, images)
      await onCreated(item)
    },
    onError: () => toast.error('Could not save this gear'),
  })

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel,
        isSubmitting,
        disabled: !form.values.name.trim() || !form.values.type,
        submitLabel,
      }}
    >
      <EntityImageUploadSection
        upload={imageUpload}
        prompt="Add pictures of your equipment"
        previewAltPrefix="Gear"
        isBusy={isSubmitting}
        statusText={isSubmitting ? 'Saving equipment pictures' : undefined}
      />

      <FormSection title="Equipment info">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="gear-name"
            label="Name"
            placeholder="e.g., My Grinder"
            value={form.values.name}
            onChange={form.setField('name')}
            required
          />
          <SelectField
            id="gear-type"
            label="Type"
            placeholder="Select type"
            value={form.values.type}
            onChange={(value) => form.set('type', value as GearType | '')}
            options={GEAR_TYPES}
            required
          />
          <InputField
            id="gear-brand"
            label="Brand"
            placeholder="e.g., Niche"
            value={form.values.brand}
            onChange={form.setField('brand')}
          />
          <InputField
            id="gear-model"
            label="Model"
            placeholder="e.g., Zero"
            value={form.values.model}
            onChange={form.setField('model')}
          />
        </div>
        <TextareaField
          id="gear-notes"
          label="Notes"
          placeholder="Any additional info about this equipment"
          value={form.values.notes}
          onChange={form.setField('notes')}
          rows={3}
        />
      </FormSection>

      <GearSubtypeFields
        type={form.values.type}
        values={subtype}
        onChange={(key, value) =>
          setSubtype((current) => ({ ...current, [key]: value }))
        }
        research={{
          enabled: researchEnabled,
          isResearching,
          onResearch: handleResearch,
          disabled:
            !form.values.name.trim() ||
            !form.values.brand.trim() ||
            !form.values.model.trim(),
        }}
      />

      <FormSection title="Purchase info">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InputField
            id="gear-purchaseDate"
            label="Purchase date"
            type="date"
            value={form.values.purchaseDate}
            onChange={form.setField('purchaseDate')}
          />
          <InputField
            id="gear-purchasePrice"
            label="Price"
            type="number"
            placeholder="e.g., 599.00"
            value={form.values.purchasePrice}
            onChange={form.setField('purchasePrice')}
            step="1"
            min="0"
          />
          <CurrencyField
            id="gear-priceCurrency"
            value={form.values.priceCurrency}
            onChange={form.setField('priceCurrency')}
          />
        </div>
      </FormSection>

      <FormSection title="Links">
        <InputField
          id="gear-productUrl"
          label="Product page"
          type="url"
          placeholder="https://…"
          value={form.values.productUrl}
          onChange={form.setField('productUrl')}
        />
        <InputField
          id="gear-manualUrl"
          label="Manual / Documentation"
          type="url"
          placeholder="https://…"
          value={form.values.manualUrl}
          onChange={form.setField('manualUrl')}
        />
      </FormSection>

      {researchedSettings ? (
        <MachineSettingsDiffModal
          open={researchModalOpen}
          onOpenChange={setResearchModalOpen}
          currentData={subtype}
          suggestedData={researchedSettings}
          onApply={(updates) => {
            setSubtype((current) => ({ ...current, ...updates }))
            toast.success(`Applied ${Object.keys(updates).length} changes`)
          }}
        />
      ) : null}
    </EntityForm>
  )
}
