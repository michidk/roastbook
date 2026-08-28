import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'

const TIME_ZONES = ['UTC', ...Intl.supportedValuesOf('timeZone')]

export function TimeZoneField({
  id,
  value,
  disabled,
  onChange,
}: {
  readonly id: string
  readonly value: string
  readonly disabled?: boolean
  readonly onChange: (value: string) => void
}) {
  const timeZones = TIME_ZONES.includes(value)
    ? TIME_ZONES
    : [value, ...TIME_ZONES]

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>IANA time zone</Label>
      <Combobox
        items={timeZones}
        value={value}
        onValueChange={(nextValue: string | null) => {
          if (nextValue) onChange(nextValue)
        }}
        disabled={disabled}
      >
        <ComboboxTrigger id={id}>
          <span className="truncate text-left">{value}</span>
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder="Search time zones…" />
          <ComboboxEmpty>No time zone found.</ComboboxEmpty>
          <ComboboxList>
            {(timeZone: string) => (
              <ComboboxItem key={timeZone} value={timeZone}>
                {timeZone}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
