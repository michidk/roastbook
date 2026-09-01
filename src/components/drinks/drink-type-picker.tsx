import { CreatableCombobox } from '@/components/form/creatable-combobox'
import type { DrinkTypeOption } from '@/lib/drink-options'

export function DrinkTypePicker({
  id,
  value,
  drinkTypes,
  suggestions = [],
  onChange,
}: {
  readonly id: string
  readonly value: string
  readonly drinkTypes: readonly DrinkTypeOption[]
  readonly suggestions?: readonly {
    readonly id: number
    readonly name: string
  }[]
  readonly onChange: (value: string) => void
}) {
  return (
    <CreatableCombobox
      id={id}
      label="Drink type"
      placeholder="Select type"
      searchPlaceholder="Search drink types…"
      emptyMessage="No drink types found."
      value={value}
      items={drinkTypes}
      suggestions={suggestions}
      getKey={({ id: drinkTypeId }) => drinkTypeId}
      getLabel={({ name }) => name}
      onChange={onChange}
    />
  )
}
