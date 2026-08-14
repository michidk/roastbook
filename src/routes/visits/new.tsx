import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { type SyntheticEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  EntityForm,
  FormActions,
  FormErrorSummary,
  FormPageHeader,
} from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { Button } from '@/components/ui/button'
import { VisitFields } from '@/components/visits/visit-fields'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import {
  useCurrentLocalDateTimeLimit,
  useLocalDateTimeInput,
} from '@/hooks/use-local-date-time-input'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { cafeVisitCreatePayload } from '@/lib/cafe-visit-payload'
import { localDateTimeInputToDate } from '@/lib/date-input'
import { focusFirstInvalidControl } from '@/lib/form-validation'
import { toNullableRating } from '@/lib/rating'
import { getActiveBeans } from '@/lib/server/beans'
import { createCafeVisit } from '@/lib/server/cafe-visits'
import { getCoffeeShops } from '@/lib/server/coffee-shops'
import { getTasteTags } from '@/lib/server/taste-tags'
import { getCafeVisitUpdateErrors } from '@/lib/update-validation'

export const Route = createFileRoute('/visits/new')({
  validateSearch: (search: Record<string, unknown>) => {
    let coffeeShopId: string | undefined
    if (typeof search.coffeeShopId === 'string') {
      coffeeShopId = search.coffeeShopId.replace(/^"|"$/g, '')
    } else if (typeof search.coffeeShopId === 'number') {
      coffeeShopId = String(search.coffeeShopId)
    }
    return { coffeeShopId: coffeeShopId || undefined }
  },
  loader: async () => {
    const [coffeeShops, tasteTags, beans] = await Promise.all([
      getCoffeeShops(),
      getTasteTags(),
      getActiveBeans(),
    ])
    return {
      coffeeShops,
      tasteTags,
      beans,
      defaultVisitedAt: new Date().toISOString(),
    }
  },
  component: NewVisitPage,
})

function NewVisitPage() {
  const { defaultCurrency } = useAppSettings()
  const { coffeeShops, tasteTags, beans, defaultVisitedAt } =
    Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const initialCoffeeShopId =
    search.coffeeShopId &&
    coffeeShops.some(
      (coffeeShop) => String(coffeeShop.id) === search.coffeeShopId,
    )
      ? search.coffeeShopId
      : ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [visitedAt, setVisitedAt] = useLocalDateTimeInput(defaultVisitedAt)
  const latestVisitedAt = useCurrentLocalDateTimeLimit()
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const [isDirty, setIsDirty] = useState(false)

  const form = useFormState({
    coffeeShopId: initialCoffeeShopId,
    beanId: '',
    drinkName: '',
    drinkType: '',
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
      await createCafeVisit({ data })
      setIsDirty(false)
      navigate({ to: '/visits' })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save this visit',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
          values={form.values}
          choices={{ coffeeShops, beans, tasteTags }}
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
