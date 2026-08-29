import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
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
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
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
import { getErrorMessage } from '@/lib/error-message'
import { focusFirstInvalidControl } from '@/lib/form-validation'
import { toNullableRating } from '@/lib/rating'
import {
  searchInteger,
  searchRecord,
  searchValidator,
} from '@/lib/search-params'
import { getActiveBeans } from '@/lib/server/beans'
import { createCafeVisit } from '@/lib/server/cafe-visits'
import { getCoffeeShops } from '@/lib/server/coffee-shops'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getTasteTags } from '@/lib/server/taste-tags'
import { getCafeVisitUpdateErrors } from '@/lib/update-validation'

const parseNewVisitSearch = (input: unknown) => {
  const search = searchRecord(input)
  return { coffeeShopId: searchInteger(search.coffeeShopId, undefined, 1) }
}

export const Route = createFileRoute('/visits/new')({
  validateSearch: searchValidator(parseNewVisitSearch),
  loader: async () => {
    const [coffeeShops, tasteTags, beans, drinks] = await Promise.all([
      getCoffeeShops(),
      getTasteTags(),
      getActiveBeans(),
      getDrinkConfiguration(),
    ])
    return {
      coffeeShops,
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
  const { coffeeShops, tasteTags, beans, drinks, defaultVisitedAt } =
    Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
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
      await router.invalidate()
      await navigate({ to: '/visits' })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this visit'))
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
