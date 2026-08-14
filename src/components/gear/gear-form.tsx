import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EntityImageUploadSection } from '@/components/form/entity-image-upload-section'
import { EntityForm } from '@/components/form/form-shell'
import { GearFields } from '@/components/gear/gear-fields'
import {
  createEmptyGearFormValues,
  gearCreatePayload,
} from '@/components/gear/gear-form-values'
import { MachineSettingsDiffModal } from '@/components/gear/machine-settings-diff-modal'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useImageUpload } from '@/hooks/useImageUpload'
import type { ExtractedMachineSettings } from '@/lib/ai'
import { getErrorMessage } from '@/lib/error-message'
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
  const [researchEnabled, setResearchEnabled] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchModalOpen, setResearchModalOpen] = useState(false)
  const [researchedSettings, setResearchedSettings] =
    useState<ExtractedMachineSettings | null>(null)
  const imageUpload = useImageUpload()
  const { images } = imageUpload

  const form = useFormState(createEmptyGearFormValues(initialName))

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
      toast.error(getErrorMessage(error, 'Research failed'))
    } finally {
      setIsResearching(false)
    }
  }

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(form.values.name.trim() && form.values.type),
    submit: async () => {
      const item = await createGear({
        data: gearCreatePayload(form.values),
      })

      const uploadResult = await uploadEntityImages('gear', item.id, images)
      if (uploadResult.failures.length > 0) {
        toast.warning(
          `Gear saved, but ${uploadResult.failures.length} ${uploadResult.failures.length === 1 ? 'picture' : 'pictures'} could not be uploaded`,
        )
      }
      await onCreated(item)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not save this gear')),
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

      <GearFields
        values={form.values}
        onChange={form.set}
        research={{
          enabled: researchEnabled,
          isResearching,
          onResearch: handleResearch,
        }}
      />

      {researchedSettings ? (
        <MachineSettingsDiffModal
          open={researchModalOpen}
          onOpenChange={setResearchModalOpen}
          currentData={form.values}
          suggestedData={researchedSettings}
          onApply={(updates) => {
            form.patch(updates)
            toast.success(`Applied ${Object.keys(updates).length} changes`)
          }}
        />
      ) : null}
    </EntityForm>
  )
}
