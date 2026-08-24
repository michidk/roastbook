import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  EntityImageUploadRecovery,
  EntityImageUploadSection,
} from '@/components/form/entity-image-upload-section'
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
import { useImageUpload } from '@/hooks/use-image-upload'
import type { ExtractedMachineSettings } from '@/lib/ai'
import { getErrorMessage } from '@/lib/error-message'
import type { ImageFile } from '@/lib/image-file'
import {
  checkGearResearchEnabled,
  createGear,
  researchMachineSettings,
} from '@/lib/server/gear'
import {
  type EntityImageUploadFailure,
  uploadEntityImages,
} from '@/lib/upload-entity-images'

type CreatedGear = Awaited<ReturnType<typeof createGear>>

interface GearFormProps {
  onCreated: (gear: CreatedGear) => void | Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function GearForm({
  onCreated,
  onCancel,
  submitLabel = 'Add gear',
}: GearFormProps) {
  const { defaultCurrency } = useAppSettings()
  const [researchEnabled, setResearchEnabled] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchModalOpen, setResearchModalOpen] = useState(false)
  const [researchedSettings, setResearchedSettings] =
    useState<ExtractedMachineSettings | null>(null)
  const [createdGear, setCreatedGear] = useState<CreatedGear | null>(null)
  const [uploadFailures, setUploadFailures] = useState<
    readonly EntityImageUploadFailure[]
  >([])
  const [isRetryingPictures, setIsRetryingPictures] = useState(false)
  const imageUpload = useImageUpload()
  const { images } = imageUpload

  const form = useFormState(createEmptyGearFormValues())

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
    const brand = form.values.brand.trim()
    const model = form.values.model.trim()
    if (!brand || !model) {
      toast.error('Enter the machine brand and model first')
      return
    }

    setIsResearching(true)
    try {
      const result = await researchMachineSettings({
        data: {
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
    canSubmit: () =>
      Boolean(
        form.values.brand.trim() &&
          form.values.model.trim() &&
          form.values.type,
      ),
    submit: async () => {
      const item = await createGear({
        data: gearCreatePayload(form.values),
      })

      const uploadResult = await uploadEntityImages('gear', item.id, images)
      imageUpload.removeImages(uploadResult.uploaded)
      if (uploadResult.failures.length > 0) {
        setCreatedGear(item)
        setUploadFailures(uploadResult.failures)
        return
      }
      await onCreated(item)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not save this gear')),
  })

  const retryPictures = async (pictures: readonly ImageFile[]) => {
    if (!createdGear) return
    setIsRetryingPictures(true)
    try {
      const result = await uploadEntityImages('gear', createdGear.id, pictures)
      imageUpload.removeImages(result.uploaded)
      setUploadFailures(result.failures)
      if (result.failures.length === 0) await onCreated(createdGear)
    } finally {
      setIsRetryingPictures(false)
    }
  }

  const removeFailedPicture = (index: number) => {
    const image = imageUpload.images[index]
    if (image) {
      setUploadFailures((current) =>
        current.filter((failure) => failure.image.preview !== image.preview),
      )
    }
    imageUpload.removeImage(index)
  }

  if (createdGear) {
    return (
      <EntityImageUploadRecovery
        upload={imageUpload}
        title="Gear saved"
        description="The entry is safe, but one or more pictures could not be uploaded. Try again, remove them, or continue without them."
        continueLabel="View gear"
        previewAltPrefix="Gear"
        isBusy={isRetryingPictures}
        statusText={isRetryingPictures ? 'Retrying pictures' : undefined}
        imageErrors={uploadFailures.map(({ image, error }) => ({
          preview: image.preview,
          filename: image.file.name,
          message: getErrorMessage(error, 'The server rejected this picture'),
        }))}
        onRetryImages={retryPictures}
        onRemoveImage={removeFailedPicture}
        onContinue={() => onCreated(createdGear)}
      />
    )
  }

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel,
        isSubmitting,
        disabled:
          !form.values.brand.trim() ||
          !form.values.model.trim() ||
          !form.values.type,
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
