import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import {
  EntityForm,
  FormActions,
  FormPageHeader,
  FormSection,
} from "@/components/form/form-shell"
import {
  CurrencyField,
  InputField,
  SelectField,
} from "@/components/form/form-field"
import { BeanPicker } from "@/components/beans/bean-picker"
import { CoffeeShopPicker } from "@/components/coffee-shops/coffee-shop-picker"
import { TastingFields } from "@/components/form/tasting-fields"
import { useFormState } from "@/hooks/use-form-state"
import { getActiveBeans } from "@/lib/server/beans"
import { getCoffeeShops } from "@/lib/server/coffee-shops"
import { getTasteTags } from "@/lib/server/taste-tags"
import { createCafeVisit } from "@/lib/server/cafe-visits"
import { DRINK_TYPE_OPTIONS } from "@/lib/constants"
import { useSettingsStore } from "@/lib/settings-store"

export const Route = createFileRoute("/visits/new")({
  validateSearch: (search: Record<string, unknown>) => {
    let coffeeShopId: string | undefined
    if (typeof search.coffeeShopId === "string") {
      coffeeShopId = search.coffeeShopId.replace(/^"|"$/g, "")
    } else if (typeof search.coffeeShopId === "number") {
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
    return { coffeeShops, tasteTags, beans }
  },
  component: NewVisitPage,
})

function NewVisitPage() {
  const defaultCurrency = useSettingsStore((state) => state.defaultCurrency)
  const { coffeeShops, tasteTags, beans } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const initialCoffeeShopId =
    search.coffeeShopId &&
    coffeeShops.some(
      (coffeeShop) => String(coffeeShop.id) === search.coffeeShopId
    )
      ? search.coffeeShopId
      : ""

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const form = useFormState({
    coffeeShopId: initialCoffeeShopId,
    beanId: "",
    drinkName: "",
    drinkType: "",
    price: "",
    currency: "EUR",
    rating: 3,
    notes: "",
  })

  useEffect(() => {
    form.set("currency", defaultCurrency)
  }, [defaultCurrency, form.set])

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await createCafeVisit({
        data: {
          coffeeShopId: form.values.coffeeShopId
            ? Number(form.values.coffeeShopId)
            : undefined,
          beanId: form.values.beanId ? Number(form.values.beanId) : undefined,
          drinkName: form.values.drinkName || undefined,
          drinkType: form.values.drinkType || undefined,
          price: form.values.price || undefined,
          currency: form.values.currency || undefined,
          rating: form.values.rating,
          notes: form.values.notes || undefined,
          tasteTagIds: selectedTags.length > 0 ? selectedTags : undefined,
        },
      })
      navigate({ to: "/visits" })
    } catch {
      toast.error("Could not save this visit")
    } finally {
      setIsSubmitting(false)
    }
  }

  const negativeTags = tasteTags.filter((t) => t.category === "negative")
  const positiveTags = tasteTags.filter((t) => t.category === "positive")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FormPageHeader title="Log Visit" description="Record your cafe experience" />

      <EntityForm onSubmit={handleSubmit}>
        <FormSection title="Location">
          <CoffeeShopPicker
            id="coffeeShop"
            label="Cafe"
            value={form.values.coffeeShopId}
            onChange={form.setField("coffeeShopId")}
            coffeeShops={coffeeShops}
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
            />
            <CurrencyField
              id="currency"
              value={form.values.currency}
              onChange={form.setField("currency")}
            />
          </div>
        </FormSection>

        <TastingFields
          kind="visit"
          rating={{ value: form.values.rating, onChange: form.setField("rating") }}
          notes={{ value: form.values.notes, onChange: form.setField("notes") }}
          tags={{ negative: negativeTags, positive: positiveTags, selectedIds: selectedTags, onToggle: toggleTag }}
        />

        <FormActions
          onCancel={() => navigate({ to: "/visits" })}
          isSubmitting={isSubmitting}
          submitLabel="Save Visit"
        />
      </EntityForm>
    </div>
  )
}
