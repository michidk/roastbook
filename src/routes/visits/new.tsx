import { Button } from '@roastbook/ui/button'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { type SyntheticEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  type BeanFormValues,
  beanCreatePayload,
} from '@/components/beans/bean-form-values'
import { EntityImageUploadRecovery } from '@/components/form/entity-image-upload-section'
import {
  EntityForm,
  FormActions,
  FormErrorSummary,
  FormPageHeader,
} from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { VisitBeanField } from '@/components/visits/visit-bean-field'
import { VisitFields } from '@/components/visits/visit-fields'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import { useImageUpload } from '@/hooks/use-image-upload'
import {
  useCurrentLocalDateTimeLimit,
  useLocalDateTimeInput,
} from '@/hooks/use-local-date-time-input'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { getBeans } from '@/journal/beans'
import { createCafeVisit } from '@/journal/cafe-visits'
import { getCoffeeShops } from '@/journal/coffee-shops'
import { getDrinkConfiguration } from '@/journal/drink-options'
import { getRoasters } from '@/journal/roasters'
import { getTasteTags } from '@/journal/taste-tags'
import { cafeVisitCreatePayload } from '@/lib/cafe-visit-payload'
import { localDateTimeInputToDate } from '@/lib/date-input'
import { getErrorMessage } from '@/lib/error-message'
import { focusFirstInvalidControl } from '@/lib/form-validation'
import { toNullableRating } from '@/lib/rating'
import {
  searchInteger,
  searchRecord,
  searchValidator,
} from '@/lib/search-params'
import { getCafeVisitUpdateErrors } from '@/lib/update-validation'
import {
  type EntityImageUploadFailure,
  uploadEntityImages,
} from '@/lib/upload-entity-images'

const parseNewVisitSearch = (input: unknown) => {
  const search = searchRecord(input)
  return { coffeeShopId: searchInteger(search.coffeeShopId, undefined, 1) }
}

export const Route = createFileRoute('/visits/new')({
  validateSearch: searchValidator(parseNewVisitSearch),
  loader: async () => {
    const [coffeeShops, tasteTags, beans, drinks, roasters] = await Promise.all(
      [
        getCoffeeShops(),
        getTasteTags(),
        getBeans(),
        getDrinkConfiguration(),
        getRoasters(),
      ],
    )
    return {
      coffeeShops,
      roasters,
      tasteTags,
      beans,
      drinks,
      defaultVisitedAt: new Date().toISOString(),
    }
  },
  component: NewVisitPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/visits" backLabel="Back to visits" />
  ),
})

function NewVisitPage() {
  const { defaultCurrency } = useAppSettings()
  const { coffeeShops, tasteTags, beans, drinks, roasters, defaultVisitedAt } =
    Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const initialCoffeeShopId =
    search.coffeeShopId !== undefined &&
    coffeeShops.some((coffeeShop) => coffeeShop.id === search.coffeeShopId)
      ? String(search.coffeeShopId)
      : ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [visitedAt, setVisitedAt] = useLocalDateTimeInput(defaultVisitedAt)
  const latestVisitedAt = useCurrentLocalDateTimeLimit()
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const [isDirty, setIsDirty] = useState(false)
  const [beanDraft, setBeanDraft] = useState<BeanFormValues | null>(null)
  const imageUpload = useImageUpload()
  const [createdVisit, setCreatedVisit] = useState<Awaited<
    ReturnType<typeof createCafeVisit>
  > | null>(null)
  const [uploadFailures, setUploadFailures] = useState<
    readonly EntityImageUploadFailure[]
  >([])
  const [isRetrying, setIsRetrying] = useState(false)

  const form = useFormState({
    coffeeShopId: initialCoffeeShopId,
    beanId: '',
    drinkTypeId: '',
    drinkOptionValueIds: {},
    price: '',
    currency: 'EUR',
    rating: 0,
    notes: '',
  })

  useEffect(() => {
    form.set('currency', defaultCurrency)
  }, [defaultCurrency, form.set])

  useUnsavedChanges(isDirty && !isSubmitting)

  const toggleTag = (tagId: number) => {
    setIsDirty(true)
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    )
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const data = {
      coffeeShopId: form.values.coffeeShopId
        ? Number(form.values.coffeeShopId)
        : undefined,
      ...cafeVisitCreatePayload(form.values),
      newBean: beanDraft ? beanCreatePayload(beanDraft) : undefined,
      visitedAt: localDateTimeInputToDate(visitedAt) ?? undefined,
      rating: toNullableRating(form.values.rating),
      tasteTagIds: selectedTags.length > 0 ? selectedTags : undefined,
    }
    const errors = getCafeVisitUpdateErrors({ id: 1, ...data })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      focusFirstInvalidControl(formElement)
      return
    }

    setIsSubmitting(true)
    try {
      const visit = await createCafeVisit({ data })
      setCreatedVisit(visit)
      setIsDirty(false)
      if (visit.beanId && beanDraft && imageUpload.images.length) {
        const result = await uploadEntityImages(
          'beans',
          visit.beanId,
          imageUpload.images,
        )
        imageUpload.removeImages(result.uploaded)
        setUploadFailures(result.failures)
        if (result.failures.length) return
      }
      await navigate({ to: '/visits' })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this visit'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdVisit)
    return (
      <Page width="form">
        <EntityImageUploadRecovery
          upload={imageUpload}
          title="Visit saved"
          description="Your visit and coffee are saved. Retry the pictures or continue without them."
          continueLabel="View visits"
          previewAltPrefix="Coffee"
          isBusy={isRetrying || isSubmitting}
          imageErrors={uploadFailures.map(({ image, error }) => ({
            preview: image.preview,
            filename: image.file.name,
            message: getErrorMessage(error, 'Could not upload picture'),
          }))}
          onRetryImages={async (pictures) => {
            if (!createdVisit.beanId) return
            setIsRetrying(true)
            try {
              const result = await uploadEntityImages(
                'beans',
                createdVisit.beanId,
                pictures,
              )
              imageUpload.removeImages(result.uploaded)
              setUploadFailures(result.failures)
              if (!result.failures.length) await navigate({ to: '/visits' })
            } finally {
              setIsRetrying(false)
            }
          }}
          onRemoveImage={(index) => {
            const image = imageUpload.images[index]
            imageUpload.removeImage(index)
            setUploadFailures((current) =>
              current.filter(
                (failure) => failure.image.preview !== image?.preview,
              ),
            )
          }}
          onContinue={() => navigate({ to: '/visits' })}
        />
      </Page>
    )

  return (
    <Page width="form">
      <FormPageHeader
        title="Log visit"
        description="Record your café experience"
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/visits" aria-label="Back to visits">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <EntityForm onSubmit={handleSubmit}>
        <FormErrorSummary errors={fieldErrors} />
        <VisitFields
          beanField={
            <VisitBeanField
              beans={beans}
              roasters={roasters}
              value={form.values.beanId}
              onChange={(value) => {
                form.set('beanId', value)
                setIsDirty(true)
              }}
              draft={beanDraft}
              onDraftChange={(value) => {
                setBeanDraft(value)
                setIsDirty(true)
              }}
              upload={imageUpload}
            />
          }
          values={form.values}
          choices={{ coffeeShops, beans, tasteTags, drinks }}
          visitedAt={{
            value: visitedAt,
            max: latestVisitedAt,
            onChange: (value) => {
              setIsDirty(true)
              setVisitedAt(value)
            },
          }}
          tasting={{
            selectedTagIds: selectedTags,
            onRatingChange: (value) => {
              setIsDirty(true)
              form.set('rating', value)
            },
            onToggleTag: toggleTag,
          }}
          errors={fieldErrors}
          onFieldChange={(field, value) => {
            setIsDirty(true)
            form.set(field, value)
          }}
        />

        <FormActions
          onCancel={() => navigate({ to: '/visits' })}
          isSubmitting={isSubmitting}
          submitLabel="Save visit"
        />
      </EntityForm>
    </Page>
  )
}
