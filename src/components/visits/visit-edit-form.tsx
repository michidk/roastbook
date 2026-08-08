import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { EntityForm, FormActions, FormSection } from "@/components/form/form-shell"
import {
  CurrencyField,
  InputField,
  SelectField,
} from "@/components/form/form-field"
import { BeanPicker } from "@/components/beans/bean-picker"
import { CoffeeShopPicker } from "@/components/coffee-shops/coffee-shop-picker"
import { VisitTastingFields } from "@/components/visits/visit-tasting-fields"
import { useFormState } from "@/hooks/use-form-state"
import { DRINK_TYPE_OPTIONS } from "@/lib/constants"
import { getActiveBeans } from "@/lib/server/beans"
import { getCafeVisit, updateCafeVisit } from "@/lib/server/cafe-visits"
import { getCoffeeShops } from "@/lib/server/coffee-shops"
import { getTasteTags } from "@/lib/server/taste-tags"
import { toNullableRating, toRatingInput } from "@/lib/rating"
import { getCafeVisitUpdateErrors } from "@/lib/update-validation"

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
    visit.tasteTags.map((tagLink) => tagLink.tasteTagId)
  )
  const form = useFormState(() => ({
    coffeeShopId: visit.coffeeShopId ? String(visit.coffeeShopId) : "",
    beanId: visit.beanId ? String(visit.beanId) : "",
    drinkName: visit.drinkName ?? "",
    drinkType: visit.drinkType ?? "",
    price: visit.price ?? "",
    currency: visit.currency ?? "EUR",
    rating: toRatingInput(visit.rating),
    notes: visit.notes ?? "",
  }))

  const negativeTags = tasteTags.filter((tag) => tag.category === "negative")
  const positiveTags = tasteTags.filter((tag) => tag.category === "positive")

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    )
  }

  const handleSave = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const updateData = {
      id: visit.id,
      coffeeShopId: form.values.coffeeShopId
        ? Number(form.values.coffeeShopId)
        : null,
      beanId: form.values.beanId ? Number(form.values.beanId) : null,
      drinkName: form.values.drinkName || undefined,
      drinkType: form.values.drinkType || undefined,
      price: form.values.price || undefined,
      currency: form.values.currency || undefined,
      rating: toNullableRating(form.values.rating),
      notes: form.values.notes || undefined,
      tasteTagIds: selectedTagIds,
    }
    const errors = getCafeVisitUpdateErrors(updateData)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await updateCafeVisit({ data: updateData })
      await onSaved()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save this visit"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntityForm id="visit-edit-form" onSubmit={handleSave}>
      <FormSection title="Location">
        <CoffeeShopPicker
          id="coffeeShop"
          label="Cafe"
          value={form.values.coffeeShopId}
          onChange={form.setField("coffeeShopId")}
          coffeeShops={coffeeShops}
          autoFocus
        />
        <BeanPicker
          id="bean"
          label="Beans"
          value={form.values.beanId}
          onChange={form.setField("beanId")}
          beans={beans}
        />
      </FormSection>

      <FormSection title="Drink">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="drinkName"
            label="Drink Name"
            placeholder="e.g., House Blend Latte"
            value={form.values.drinkName}
            onChange={form.setField("drinkName")}
          />
          <SelectField
            id="drinkType"
            label="Type"
            placeholder="Select type"
            value={form.values.drinkType}
            onChange={form.setField("drinkType")}
            options={DRINK_TYPE_OPTIONS}
          />
          <InputField
            id="price"
            label="Price"
            inputMode="decimal"
            placeholder="4.50"
            value={form.values.price}
            onChange={form.setField("price")}
            error={fieldErrors.price}
          />
          <CurrencyField
            id="currency"
            value={form.values.currency}
            onChange={form.setField("currency")}
          />
        </div>
      </FormSection>

      <VisitTastingFields
        rating={form.values.rating}
        onRatingChange={(rating) =>
          form.set("rating", form.values.rating === rating ? 0 : rating)
        }
        notes={form.values.notes}
        onNotesChange={form.setField("notes")}
        negativeTags={negativeTags}
        positiveTags={positiveTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
      />

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel="Save Visit"
      />
    </EntityForm>
  )
}
