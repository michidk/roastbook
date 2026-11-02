import { useCallback } from 'react'
import { NumberInput } from '@/components/number-input'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { cn } from '@/lib/utils'

const MAX_ALTITUDE_METERS = 9_000

interface AltitudeRangeFieldProps {
  readonly id: string
  readonly min: string
  readonly max: string
  readonly onMinChange: (value: string) => void
  readonly onMaxChange: (value: string) => void
  readonly disabled?: boolean
  readonly className?: string
}

export function AltitudeRangeField({
  id,
  min,
  max,
  onMinChange,
  onMaxChange,
  disabled,
  className,
}: AltitudeRangeFieldProps) {
  const isInverted =
    min.trim() !== '' && max.trim() !== '' && Number(min) > Number(max)
  const descriptionId = isInverted ? `${id}-error` : `${id}-hint`

  return (
    <fieldset className={cn('min-w-0 space-y-2', className)}>
      <legend className="mb-2 text-sm leading-none font-medium">
        Altitude
      </legend>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <NumberInput
          id={`${id}-min`}
          aria-label="Lowest altitude"
          aria-describedby={descriptionId}
          placeholder="1800"
          value={min}
          onChange={onMinChange}
          min={0}
          max={MAX_ALTITUDE_METERS}
          step={50}
          unit="m"
          unitPlacement="inline"
          disabled={disabled}
        />
        <span aria-hidden="true" className="text-sm text-muted-foreground">
          to
        </span>
        <NumberInput
          id={`${id}-max`}
          aria-label="Highest altitude"
          aria-describedby={descriptionId}
          aria-invalid={isInverted}
          placeholder="2100"
          value={max}
          onChange={onMaxChange}
          min={0}
          max={MAX_ALTITUDE_METERS}
          step={50}
          unit="m"
          unitPlacement="inline"
          disabled={disabled}
        />
      </div>
      {isInverted ? (
        <p id={descriptionId} className="text-sm text-destructive-text">
          The highest altitude is below the lowest.
        </p>
      ) : (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          Meters above sea level. Fill one side for a single altitude.
        </p>
      )}
    </fieldset>
  )
}

/** Formats a stored altitude range as `1,800–2,100 m` or `1,950 m`. */
export function useAltitudeFormatter() {
  const formatNumber = useNumberFormatter()
  return useCallback(
    (min: number | null, max: number | null) => {
      if (min == null && max == null) return null
      if (min == null || max == null || min === max) {
        return `${formatNumber(min ?? max ?? 0)} m`
      }
      return `${formatNumber(min)}–${formatNumber(max)} m`
    },
    [formatNumber],
  )
}
