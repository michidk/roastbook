import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BeanFields } from '@/components/beans/bean-fields'
import {
  beanCreatePayload,
  createEmptyBeanFormValues,
} from '@/components/beans/bean-form-values'
import { EntityImageUploadSection } from '@/components/form/entity-image-upload-section'
import { EntityForm } from '@/components/form/form-shell'
import type { RoasterOption } from '@/components/roasters/roaster-picker'
import { Button } from '@/components/ui/button'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useImageUpload } from '@/hooks/useImageUpload'
import { getErrorMessage } from '@/lib/error-message'
import {
  checkVisionEnabled,
  createBean,
  extractBeanInfo,
} from '@/lib/server/beans'
import { getRoasters } from '@/lib/server/roasters'
import {
  getEntityImageUploadFailureMessage,
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
      const failureMessage = getEntityImageUploadFailureMessage(
        uploadResult.failures,
      )
      if (failureMessage) toast.warning(`Beans saved. ${failureMessage}`)
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

      <BeanFields
        values={form.values}
        onChange={form.set}
        roasters={roasterOptions}
      />
    </EntityForm>
  )
}
