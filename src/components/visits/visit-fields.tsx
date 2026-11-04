import { BeanPicker } from '@/components/beans/bean-picker'
import { CoffeeShopPicker } from '@/components/coffee-shops/coffee-shop-picker'
import { DrinkSelectionFields } from '@/components/drinks/drink-selection-fields'
import { DateTimeField } from '@/components/form/date-field'
import { CurrencyField, CurrencyInputField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { TastingFields } from '@/components/form/tasting-fields'
import type { getBeans } from '@/journal/beans'
import type { getCoffeeShops } from '@/journal/coffee-shops'
import type { getTasteTags } from '@/journal/taste-tags'
import type { CafeVisitFormValues } from '@/lib/cafe-visit-payload'
import type { DrinkConfiguration } from '@/lib/drink-options'

export type VisitFieldValues = CafeVisitFormValues & {
  readonly coffeeShopId: string
  readonly rating: number
}

type VisitFieldsProps = {
  readonly values: VisitFieldValues
  readonly choices: {
    readonly coffeeShops: Awaited<ReturnType<typeof getCoffeeShops>>
    readonly beans: Awaited<ReturnType<typeof getBeans>>
    readonly tasteTags: Awaited<ReturnType<typeof getTasteTags>>
    readonly drinks: DrinkConfiguration
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
          createAsArchived
        />
        <DateTimeField
          id="visitedAt"
          label="Visited at"
          value={visitedAt.value}
          onChange={visitedAt.onChange}
          max={visitedAt.max}
          error={errors.visitedAt}
          required
        />
      </FormSection>

      <FormSection title="Drink">
        {/* One line from md: drink, its options and the price sit side by side. */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:[&>*]:min-w-0 md:[&>*]:flex-1">
          <DrinkSelectionFields
            configuration={choices.drinks}
            values={values}
            onChange={(next) => {
              onFieldChange('drinkTypeId', next.drinkTypeId)
              onFieldChange('drinkOptionValueIds', next.drinkOptionValueIds)
            }}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.5fr)] gap-4 md:flex-[1.6]">
            <CurrencyInputField
              id="price"
              label="Price"
              currency={values.currency}
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
          options: choices.tasteTags,
          selectedIds: tasting.selectedTagIds,
          onToggle: tasting.onToggleTag,
        }}
      />
    </>
  )
}
