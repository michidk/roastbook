import { type SyntheticEvent, useState } from 'react'
import { toast } from 'sonner'
import { EntityForm, FormErrorSummary } from '@/components/form/form-shell'
import { VisitFields } from '@/components/visits/visit-fields'
import { useFormState } from '@/hooks/use-form-state'
import {
  useCurrentLocalDateTimeLimit,
  useLocalDateTimeInput,
} from '@/hooks/use-local-date-time-input'
import { cafeVisitUpdatePayload } from '@/lib/cafe-visit-payload'
import { localDateTimeInputToDate } from '@/lib/date-input'
import { focusFirstInvalidControl } from '@/lib/form-validation'
import { toNullableRating, toRatingInput } from '@/lib/rating'
import type { getActiveBeans } from '@/lib/server/beans'
import { type getCafeVisit, updateCafeVisit } from '@/lib/server/cafe-visits'
import type { getCoffeeShops } from '@/lib/server/coffee-shops'
import type { getTasteTags } from '@/lib/server/taste-tags'
import { getCafeVisitUpdateErrors } from '@/lib/update-validation'

type Visit = NonNullable<Awaited<ReturnType<typeof getCafeVisit>>>

type VisitEditFormProps = {
  readonly visit: Visit
  readonly coffeeShops: Awaited<ReturnType<typeof getCoffeeShops>>
  readonly beans: Awaited<ReturnType<typeof getActiveBeans>>
  readonly tasteTags: Awaited<ReturnType<typeof getTasteTags>>
  readonly onCancel: () => void
  readonly onSaved: () => Promise<void>
}

export function VisitEditForm({
  visit,
  coffeeShops,
  beans,
  tasteTags,
  onCancel,
  onSaved,
}: VisitEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const [selectedTagIds, setSelectedTagIds] = useState(() =>
    visit.tasteTags.map((tagLink) => tagLink.tasteTagId),
  )
  const [visitedAt, setVisitedAt] = useLocalDateTimeInput(visit.visitedAt)
  const latestVisitedAt = useCurrentLocalDateTimeLimit()
  const form = useFormState(() => ({
    coffeeShopId: visit.coffeeShopId ? String(visit.coffeeShopId) : '',
    beanId: visit.beanId ? String(visit.beanId) : '',
    drinkName: visit.drinkName ?? '',
    drinkType: visit.drinkType ?? '',
    price: visit.price ?? '',
    currency: visit.currency ?? 'EUR',
    rating: toRatingInput(visit.rating),
    notes: visit.notes ?? '',
  }))

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    )
  }

  const handleSave = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const updateData = {
      id: visit.id,
      coffeeShopId: form.values.coffeeShopId
        ? Number(form.values.coffeeShopId)
        : null,
      ...cafeVisitUpdatePayload(form.values),
      visitedAt: localDateTimeInputToDate(visitedAt) ?? visit.visitedAt,
      rating: toNullableRating(form.values.rating),
      tasteTagIds: selectedTagIds,
    }
    const errors = getCafeVisitUpdateErrors(updateData)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      focusFirstInvalidControl(formElement)
      return
    }

    setIsSubmitting(true)
    try {
      await updateCafeVisit({ data: updateData })
      await onSaved()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save this visit',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntityForm
      id="visit-edit-form"
      onSubmit={handleSave}
      actions={{ onCancel, isSubmitting, submitLabel: 'Save visit' }}
    >
      <FormErrorSummary errors={fieldErrors} />
      <VisitFields
        values={form.values}
        choices={{ coffeeShops, beans, tasteTags }}
        visitedAt={{
          value: visitedAt,
          max: latestVisitedAt,
          onChange: setVisitedAt,
        }}
        tasting={{
          selectedTagIds,
          onRatingChange: (rating) => form.set('rating', rating),
          onToggleTag: toggleTag,
        }}
        errors={fieldErrors}
        autoFocusCoffeeShop
        onFieldChange={form.set}
      />
    </EntityForm>
  )
}
