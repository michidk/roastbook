import { Toggle } from '@/components/ui/toggle'

type AccessoryGear = {
  readonly id: number
  readonly name: string
}

type AccessoryGearPickerProps = {
  readonly items: readonly AccessoryGear[]
  readonly value: readonly number[]
  readonly onChange: (value: number[]) => void
  readonly label?: string
}

export function AccessoryGearPicker({
  items,
  value,
  onChange,
  label,
}: AccessoryGearPickerProps) {
  if (items.length === 0) return null

  const controls = (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Toggle
          key={item.id}
          variant="outline"
          className="min-h-11"
          pressed={value.includes(item.id)}
          onPressedChange={(pressed) =>
            onChange(
              pressed
                ? [...value, item.id]
                : value.filter((id) => id !== item.id),
            )
          }
        >
          {item.name}
        </Toggle>
      ))}
    </div>
  )

  return label ? (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {controls}
    </fieldset>
  ) : (
    controls
  )
}
