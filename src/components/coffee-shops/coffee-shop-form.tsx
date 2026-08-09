import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { EntityForm, FormSection } from "@/components/form/form-shell"
import { InputField, TextareaField } from "@/components/form/form-field"
import {
  CoffeeShopOsmSearch,
  type CoffeeShopSearchResult,
} from "@/components/coffee-shops/coffee-shop-osm-search"
import { useFormState } from "@/hooks/use-form-state"
import { createCoffeeShop } from "@/lib/server/coffee-shops"
import {
  applyCoffeeShopSearchResult,
  createCoffeeShopFormValues,
} from "@/components/coffee-shops/coffee-shop-form-values"

type CreatedCoffeeShop = Awaited<ReturnType<typeof createCoffeeShop>>

interface CoffeeShopFormProps {
  onCreated: (coffeeShop: CreatedCoffeeShop) => void | Promise<void>
  onCancel: () => void
  initialName?: string
  submitLabel?: string
}

export function CoffeeShopForm({
  onCreated,
  onCancel,
  initialName = "",
  submitLabel = "Add Coffee Shop",
}: CoffeeShopFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useFormState(createCoffeeShopFormValues(null, initialName))

  const applySearchResult = (result: CoffeeShopSearchResult) => {
    form.setValues((current) => applyCoffeeShopSearchResult(current, result))
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.values.name.trim()) return

    setIsSubmitting(true)

    try {
      const coffeeShop = await createCoffeeShop({
        data: {
          name: form.values.name,
          address: form.values.address || undefined,
          city: form.values.city || undefined,
          country: form.values.country || undefined,
          latitude: form.values.latitude || undefined,
          longitude: form.values.longitude || undefined,
          website: form.values.website || undefined,
          notes: form.values.notes || undefined,
        },
      })
      toast.success("Coffee shop created")
      await onCreated(coffeeShop)
    } catch {
      toast.error("Could not save this coffee shop")
    } finally {
      setIsSubmitting(false)
    }
  }

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
      <FormSection title="Basic Info">
        <CoffeeShopOsmSearch
          onApply={applySearchResult}
          initialQuery={initialName}
        />

        <InputField
          id="name"
          label="Name"
          placeholder="e.g., Blue Bottle Coffee"
          value={form.values.name}
          onChange={form.setField("name")}
          required
        />

        <InputField
          id="address"
          label="Address"
          placeholder="Street address"
          value={form.values.address}
          onChange={form.setField("address")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="city"
            label="City"
            placeholder="e.g., San Francisco"
            value={form.values.city}
            onChange={form.setField("city")}
          />
          <InputField
            id="country"
            label="Country"
            placeholder="e.g., USA"
            value={form.values.country}
            onChange={form.setField("country")}
          />
        </div>
      </FormSection>

      <FormSection
        title="Coordinates"
        description="Add coordinates to pin this coffee shop on the map. You can leave these blank and add them later."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="latitude"
            label="Latitude"
            inputMode="decimal"
            placeholder="e.g., 37.7764"
            value={form.values.latitude}
            onChange={form.setField("latitude")}
          />
          <InputField
            id="longitude"
            label="Longitude"
            inputMode="decimal"
            placeholder="e.g., -122.4231"
            value={form.values.longitude}
            onChange={form.setField("longitude")}
          />
        </div>
      </FormSection>

      <FormSection title="Online">
        <InputField
          id="website"
          label="Website"
          type="url"
          placeholder="https://..."
          value={form.values.website}
          onChange={form.setField("website")}
        />
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id="notes"
          label=""
          placeholder="Any notes about this coffee shop"
          value={form.values.notes}
          onChange={form.setField("notes")}
          rows={3}
        />
      </FormSection>

    </EntityForm>
  )
}
