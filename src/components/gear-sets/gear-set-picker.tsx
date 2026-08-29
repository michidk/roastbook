import { CreatableCombobox } from '@/components/form/creatable-combobox'

type GearSetOption = {
  readonly id: number
  readonly name: string
}

type GearSetPickerProps = {
  readonly id: string
  readonly value: string
  readonly gearSets: readonly GearSetOption[]
  readonly onChange: (value: string) => void
}

export function GearSetPicker({
  id,
  value,
  gearSets,
  onChange,
}: GearSetPickerProps) {
  return (
    <CreatableCombobox
      id={id}
      label="Load gear set"
      value={value}
      items={gearSets}
      suggestions={gearSets.slice(0, 5)}
      getKey={({ id: gearSetId }) => gearSetId}
      getLabel={({ name }) => name}
      onChange={onChange}
      placeholder="Choose a gear set"
      searchPlaceholder="Search gear sets…"
      emptyMessage="No gear sets found."
    />
  )
}
