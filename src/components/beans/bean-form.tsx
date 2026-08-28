import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AiActionHelp } from '@/components/ai-action-help'
import { BeanFields } from '@/components/beans/bean-fields'
import {
  beanCreatePayload,
  createEmptyBeanFormValues,
} from '@/components/beans/bean-form-values'
import {
  type BeanFormData,
  BeanInfoDiffModal,
} from '@/components/beans/bean-info-diff-modal'
import {
  EntityImageUploadRecovery,
  EntityImageUploadSection,
} from '@/components/form/entity-image-upload-section'
import { EntityForm } from '@/components/form/form-shell'
import {
  ExtractedRoasterDialog,
  roasterDetailsFromExtraction,
} from '@/components/roasters/extracted-roaster-dialog'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import type { RoasterOption } from '@/components/roasters/roaster-picker'
import { Button } from '@/components/ui/button'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useImageUpload } from '@/hooks/use-image-upload'
import type { ExtractedBeanInfo } from '@/lib/ai'
import { getErrorMessage } from '@/lib/error-message'
import type { ImageFile } from '@/lib/image-file'
import { findRoasterByName } from '@/lib/roaster-match'
import {
  checkVisionEnabled,
  createBean,
  extractBeanInfo,
} from '@/lib/server/beans'
import { getRoasters } from '@/lib/server/roasters'
import {
  type EntityImageUploadFailure,
  uploadEntityImages,
} from '@/lib/upload-entity-images'

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
  const [createdRoasters, setCreatedRoasters] = useState<
    readonly RoasterOption[]
  >([])
  const [suggestedData, setSuggestedData] = useState<ExtractedBeanInfo | null>(
    null,
  )
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [extractedRoasterName, setExtractedRoasterName] = useState<
    string | null
  >(null)
  const [extractedRoasterDetails, setExtractedRoasterDetails] = useState<
    Partial<RoasterFormValues>
  >({})
  const [createdBean, setCreatedBean] = useState<CreatedBean | null>(null)
  const [uploadFailures, setUploadFailures] = useState<
    readonly EntityImageUploadFailure[]
  >([])
  const [isRetryingPictures, setIsRetryingPictures] = useState(false)
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

  const baseRoasters = roasters ?? loadedRoasters
  const roasterOptions = [
    ...baseRoasters,
    ...createdRoasters.filter(
      (created) => !baseRoasters.some((roaster) => roaster.id === created.id),
    ),
  ]

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

      setSuggestedData(extracted)
      setDiffModalOpen(true)
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
      imageUpload.removeImages(uploadResult.uploaded)
      if (uploadResult.failures.length > 0) {
        setCreatedBean(bean)
        setUploadFailures(uploadResult.failures)
        return
      }
      await onCreated(bean)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not save these beans')),
  })

  const retryPictures = async (pictures: readonly ImageFile[]) => {
    if (!createdBean) return
    setIsRetryingPictures(true)
    try {
      const result = await uploadEntityImages('beans', createdBean.id, pictures)
      imageUpload.removeImages(result.uploaded)
      setUploadFailures(result.failures)
      if (result.failures.length === 0) await onCreated(createdBean)
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

  if (createdBean) {
    return (
      <EntityImageUploadRecovery
        upload={imageUpload}
        title="Beans saved"
        description="The entry is safe, but one or more pictures could not be uploaded. Try again, remove them, or continue without them."
        continueLabel="View beans"
        previewAltPrefix="Bean"
        isBusy={isRetryingPictures}
        statusText={isRetryingPictures ? 'Retrying pictures' : undefined}
        imageErrors={uploadFailures.map(({ image, error }) => ({
          preview: image.preview,
          filename: image.file.name,
          message: getErrorMessage(error, 'The server rejected this picture'),
        }))}
        onRetryImages={retryPictures}
        onRemoveImage={removeFailedPicture}
        onContinue={() => onCreated(createdBean)}
      />
    )
  }

  return (
    <>
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
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-0 flex-1"
                  onClick={handleFillWithAI}
                  disabled={isExtracting || images.length === 0}
                >
                  {isExtracting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Extract details with AI
                </Button>
                <AiActionHelp>
                  Reads coffee and roaster details from the packaging. Uses only
                  the first uploaded picture.
                </AiActionHelp>
              </div>
            ) : undefined
          }
        />

        <BeanFields
          values={form.values}
          onChange={form.set}
          roasters={roasterOptions}
        />
      </EntityForm>
      {suggestedData ? (
        <BeanInfoDiffModal
          open={diffModalOpen}
          onOpenChange={setDiffModalOpen}
          currentData={form.values}
          suggestedData={suggestedData}
          onApply={(updates: Partial<BeanFormData>) => form.patch(updates)}
          onReviewRoaster={(name) => {
            const matchedRoaster = findRoasterByName(roasterOptions, name)
            if (String(matchedRoaster?.id ?? '') === form.values.roasterId) {
              return
            }
            setExtractedRoasterDetails(
              roasterDetailsFromExtraction(suggestedData),
            )
            setExtractedRoasterName(name)
          }}
          source="image"
        />
      ) : null}
      {extractedRoasterName ? (
        <ExtractedRoasterDialog
          open
          suggestedName={extractedRoasterName}
          suggestedDetails={extractedRoasterDetails}
          currentRoasterId={form.values.roasterId}
          roasters={roasterOptions}
          onOpenChange={(open) => {
            if (!open) setExtractedRoasterName(null)
          }}
          onSelect={(roaster) => form.set('roasterId', String(roaster.id))}
          onCreated={(roaster) => {
            setCreatedRoasters((current) => [...current, roaster])
            form.set('roasterId', String(roaster.id))
            setExtractedRoasterName(null)
          }}
        />
      ) : null}
    </>
  )
}
