import { BeanPicker } from '@/components/beans/bean-picker'
import { CoffeeShopPicker } from '@/components/coffee-shops/coffee-shop-picker'
import {
  CurrencyField,
  InputField,
  SelectField,
} from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { TastingFields } from '@/components/form/tasting-fields'
import type { CafeVisitFormValues } from '@/lib/cafe-visit-payload'
import { DRINK_TYPE_OPTIONS } from '@/lib/constants'
import type { getActiveBeans } from '@/lib/server/beans'
import type { getCoffeeShops } from '@/lib/server/coffee-shops'
import type { getTasteTags } from '@/lib/server/taste-tags'
import { isNegativeTasteTag } from '@/lib/taste-tags'

export type VisitFieldValues = CafeVisitFormValues & {
  readonly coffeeShopId: string
  readonly rating: number
}

type VisitFieldsProps = {
  readonly values: VisitFieldValues
  readonly choices: {
    readonly coffeeShops: Awaited<ReturnType<typeof getCoffeeShops>>
    readonly beans: Awaited<ReturnType<typeof getActiveBeans>>
    readonly tasteTags: Awaited<ReturnType<typeof getTasteTags>>
  }
  readonly visitedAt: {
    readonly value: string
    readonly onChange: (value: string) => void
    readonly max?: string
  }
  readonly tasting: {
    readonly selectedTagIds: readonly number[]
    readonly onRatingChange: (rating: number) => void
    readonly onToggleTag: (tagId: number) => void
  }
  readonly errors?: Readonly<Record<string, string>>
  readonly autoFocusCoffeeShop?: boolean
  readonly onFieldChange: <TKey extends keyof VisitFieldValues>(
    field: TKey,
    value: VisitFieldValues[TKey],
  ) => void
}

export function VisitFields({
  values,
  choices,
  visitedAt,
  tasting,
  errors = {},
  autoFocusCoffeeShop,
  onFieldChange,
}: VisitFieldsProps) {
  const negativeTags = choices.tasteTags.filter(isNegativeTasteTag)
  const positiveTags = choices.tasteTags.filter(
    (tag) => !isNegativeTasteTag(tag),
  )

  return (
    <>
      <FormSection title="Location">
        <CoffeeShopPicker
          id="coffeeShop"
          label="Café"
          value={values.coffeeShopId}
          onChange={(value) => onFieldChange('coffeeShopId', value)}
          coffeeShops={choices.coffeeShops}
          autoFocus={autoFocusCoffeeShop}
        />
        <BeanPicker
          id="bean"
          label="Beans"
          value={values.beanId}
          onChange={(value) => onFieldChange('beanId', value)}
          beans={choices.beans}
        />
        <InputField
          id="visitedAt"
          label="Visited at"
          type="datetime-local"
          value={visitedAt.value}
          onChange={visitedAt.onChange}
          max={visitedAt.max}
          error={errors.visitedAt}
          required
        />
      </FormSection>

      <FormSection title="Drink">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="drinkName"
            label="Drink name"
            placeholder="e.g., House Blend Latte"
            value={values.drinkName}
            onChange={(value) => onFieldChange('drinkName', value)}
          />
          <SelectField
            id="drinkType"
            label="Type"
            placeholder="Select type"
            value={values.drinkType}
            onChange={(value) => onFieldChange('drinkType', value)}
            options={DRINK_TYPE_OPTIONS}
          />
          <InputField
            id="price"
            label="Price"
            type="number"
            min="0"
            step="0.5"
            placeholder="4.50"
            value={values.price}
            onChange={(value) => onFieldChange('price', value)}
            error={errors.price}
          />
          <CurrencyField
            id="currency"
            value={values.currency}
            onChange={(value) => onFieldChange('currency', value)}
            error={errors.currency}
          />
        </div>
      </FormSection>

      <TastingFields
        kind="visit"
        rating={{ value: values.rating, onChange: tasting.onRatingChange }}
        notes={{
          value: values.notes,
          onChange: (value) => onFieldChange('notes', value),
        }}
        tags={{
          negative: negativeTags,
          positive: positiveTags,
          selectedIds: tasting.selectedTagIds,
          onToggle: tasting.onToggleTag,
        }}
      />
    </>
  )
}
