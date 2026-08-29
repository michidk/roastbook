import { Minus, Plus } from 'lucide-react'
import { type ComponentProps, type KeyboardEvent, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppSettings } from '@/hooks/use-app-settings'
import {
  formatNumber,
  formatNumberPlaceholder,
  normalizeNumberInput,
  stepNumberValue,
} from '@/lib/number-format'
import { cn } from '@/lib/utils'

type NumberInputProps = Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'onChange' | 'min' | 'max' | 'step'
> & {
  value: string
  onChange: (value: string) => void
  min?: string | number
  max?: string | number
  step?: string | number
  showStepper?: boolean
  unit?: string
  unitPosition?: 'prefix' | 'suffix'
  unitPlacement?: 'edge' | 'inline'
}

function finiteNumber(value: string | number | undefined) {
  if (value === undefined || value === 'any' || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  disabled,
  placeholder,
  onKeyDown,
  'aria-describedby': ariaDescribedBy,
  showStepper = true,
  unit,
  unitPosition = 'suffix',
  unitPlacement = 'edge',
  ...props
}: NumberInputProps) {
  const { numberFormat } = useAppSettings()
  const unitDescriptionId = useId()
  const minimum = finiteNumber(min)
  const maximum = finiteNumber(max)
  const increment = finiteNumber(step) ?? 1
  const numericValue = value === '' || value === '-' ? undefined : Number(value)
  const atMinimum =
    numericValue !== undefined &&
    minimum !== undefined &&
    numericValue <= minimum
  const atMaximum =
    numericValue !== undefined &&
    maximum !== undefined &&
    numericValue >= maximum
  const formattedValue = formatNumber(value, numberFormat)
  const formattedPlaceholder = formatNumberPlaceholder(
    placeholder,
    numberFormat,
  )
  const inlineReferenceValue = formattedValue || formattedPlaceholder || ''
  const valueWithUnit = unit
    ? unitPosition === 'prefix'
      ? `${unit} ${formattedValue}`
      : `${formattedValue} ${unit}`
    : formattedValue

  const changeBy = (direction: -1 | 1) => {
    onChange(
      stepNumberValue({
        value,
        step: increment,
        direction,
        min: minimum,
        max: maximum,
      }),
    )
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)
    if (!showStepper) return
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      changeBy(1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      changeBy(-1)
    }
  }

  const input = (
    <Input
      {...props}
      type="text"
      role={showStepper ? 'spinbutton' : undefined}
      inputMode="decimal"
      value={formattedValue}
      placeholder={formattedPlaceholder}
      disabled={disabled}
      aria-describedby={
        [ariaDescribedBy, !showStepper && unit ? unitDescriptionId : undefined]
          .filter(Boolean)
          .join(' ') || undefined
      }
      className={
        showStepper
          ? cn(
              'relative min-w-0 flex-1 rounded-none border-x-0 text-center tabular-nums focus-visible:z-20',
              unit &&
                unitPlacement === 'edge' &&
                (unitPosition === 'prefix' ? 'pl-12' : 'pr-12'),
            )
          : cn(
              'tabular-nums',
              unit &&
                unitPlacement === 'edge' &&
                (unitPosition === 'prefix' ? 'pl-12' : 'pr-12'),
              !unit && className,
            )
      }
      aria-valuemin={showStepper ? minimum : undefined}
      aria-valuemax={showStepper ? maximum : undefined}
      aria-valuenow={
        showStepper &&
        numericValue !== undefined &&
        Number.isFinite(numericValue)
          ? numericValue
          : undefined
      }
      aria-valuetext={showStepper && value ? valueWithUnit : undefined}
      onChange={(event) => {
        const normalized = normalizeNumberInput(event.target.value)
        if (normalized !== null) onChange(normalized)
      }}
      onKeyDown={handleKeyDown}
    />
  )

  const inputWithUnit = unit ? (
    <div className={cn('relative min-w-0', showStepper ? 'flex-1' : className)}>
      {input}
      <span
        id={!showStepper ? unitDescriptionId : undefined}
        aria-hidden={showStepper ? true : undefined}
        className={cn(
          'pointer-events-none absolute inset-y-0 z-20 flex items-center text-muted-foreground',
          unitPlacement === 'inline'
            ? 'inset-x-0 justify-center text-base md:text-sm'
            : unitPosition === 'prefix'
              ? 'left-3 text-sm'
              : 'right-3 text-sm',
          disabled && 'opacity-60',
        )}
      >
        {unitPlacement === 'inline' ? (
          <span className="relative invisible tabular-nums">
            {inlineReferenceValue}
            <span
              className={cn(
                'visible absolute top-1/2 -translate-y-1/2 text-sm text-muted-foreground',
                unitPosition === 'prefix'
                  ? 'right-full mr-1'
                  : 'left-full ml-1',
              )}
            >
              {unit}
            </span>
          </span>
        ) : (
          unit
        )}
      </span>
    </div>
  ) : (
    input
  )

  if (!showStepper) return inputWithUnit

  return (
    <div className={cn('flex min-w-0', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="relative z-10 rounded-r-none border-input bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground [@media(hover:hover)_and_(pointer:fine)]:size-9"
        disabled={disabled || atMinimum}
        onClick={() => changeBy(-1)}
        aria-label={`Decrease by ${formatNumber(String(increment), numberFormat)}`}
      >
        <Minus aria-hidden="true" />
      </Button>
      {inputWithUnit}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="relative z-10 rounded-l-none border-input bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground [@media(hover:hover)_and_(pointer:fine)]:size-9"
        disabled={disabled || atMaximum}
        onClick={() => changeBy(1)}
        aria-label={`Increase by ${formatNumber(String(increment), numberFormat)}`}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  )
}
