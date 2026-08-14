import type { CoffeeShopFormValues } from '@/components/coffee-shops/coffee-shop-form-values'
import {
  CoffeeShopOsmSearch,
  type CoffeeShopSearchResult,
} from '@/components/coffee-shops/coffee-shop-osm-search'
import { InputField, TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { StarRating } from '@/components/ui/star-rating'

type CoffeeShopRatingField = {
  readonly value: number
  readonly onChange: (value: number) => void
}

type CoffeeShopFieldsProps = {
  readonly values: CoffeeShopFormValues
  readonly onChange: <Key extends keyof CoffeeShopFormValues>(
    key: Key,
    value: CoffeeShopFormValues[Key],
  ) => void
  readonly onApplySearchResult: (result: CoffeeShopSearchResult) => void
  readonly initialQuery: string
  readonly idPrefix?: string
  readonly rating?: CoffeeShopRatingField
}

export function CoffeeShopFields({
  values,
  onChange,
  onApplySearchResult,
  initialQuery,
  idPrefix = 'coffee-shop',
  rating,
}: CoffeeShopFieldsProps) {
  const id = (field: string) => `${idPrefix}-${field}`

  return (
    <>
      <FormSection title="Basic info">
        <CoffeeShopOsmSearch
          onApply={onApplySearchResult}
          initialQuery={initialQuery}
        />
        <InputField
          id={id('name')}
          label="Name"
          placeholder="e.g., Blue Bottle Coffee"
          value={values.name}
          onChange={(value) => onChange('name', value)}
          required
        />
        {rating ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">Rating</span>
            <StarRating
              value={rating.value}
              onChange={rating.onChange}
              ariaLabel="Café rating"
            />
          </div>
        ) : null}
        <InputField
          id={id('address')}
          label="Address"
          placeholder="Street address"
          value={values.address}
          onChange={(value) => onChange('address', value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id={id('city')}
            label="City"
            placeholder="e.g., San Francisco"
            value={values.city}
            onChange={(value) => onChange('city', value)}
          />
          <InputField
            id={id('country')}
            label="Country"
            placeholder="e.g., USA"
            value={values.country}
            onChange={(value) => onChange('country', value)}
          />
        </div>
      </FormSection>

      <FormSection
        title="Coordinates"
        description="Add coordinates to pin this café on the map. You can leave these blank and add them later."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id={id('latitude')}
            label="Latitude"
            type="number"
            min={-90}
            max={90}
            step="0.001"
            showStepper={false}
            placeholder="e.g., 37.7764"
            value={values.latitude}
            onChange={(value) => onChange('latitude', value)}
          />
          <InputField
            id={id('longitude')}
            label="Longitude"
            type="number"
            min={-180}
            max={180}
            step="0.001"
            showStepper={false}
            placeholder="e.g., -122.4231"
            value={values.longitude}
            onChange={(value) => onChange('longitude', value)}
          />
        </div>
      </FormSection>

      <FormSection title="Online">
        <InputField
          id={id('website')}
          label="Website"
          type="url"
          placeholder="https://…"
          value={values.website}
          onChange={(value) => onChange('website', value)}
        />
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id={id('notes')}
          label="Notes"
          placeholder="Any notes about this café"
          value={values.notes}
          onChange={(value) => onChange('notes', value)}
          rows={3}
        />
      </FormSection>
    </>
  )
}
