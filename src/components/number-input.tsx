import { Minus, Plus } from 'lucide-react'
import type { ComponentProps, KeyboardEvent } from 'react'
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
  showStepper = true,
  ...props
}: NumberInputProps) {
  const { numberFormat } = useAppSettings()
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
      value={formatNumber(value, numberFormat)}
      placeholder={formatNumberPlaceholder(placeholder, numberFormat)}
      disabled={disabled}
      className={
        showStepper
          ? 'relative min-w-0 flex-1 rounded-none border-x-0 text-center tabular-nums focus-visible:z-20'
          : cn('tabular-nums', className)
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
      aria-valuetext={
        showStepper && value ? formatNumber(value, numberFormat) : undefined
      }
      onChange={(event) => {
        const normalized = normalizeNumberInput(event.target.value)
        if (normalized !== null) onChange(normalized)
      }}
      onKeyDown={handleKeyDown}
    />
  )

  if (!showStepper) return input

  return (
    <div className={cn('flex min-w-0', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="relative z-10 rounded-r-none border-input bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
        disabled={disabled || atMinimum}
        onClick={() => changeBy(-1)}
        aria-label={`Decrease by ${formatNumber(String(increment), numberFormat)}`}
      >
        <Minus aria-hidden="true" />
      </Button>
      {input}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="relative z-10 rounded-l-none border-input bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
        disabled={disabled || atMaximum}
        onClick={() => changeBy(1)}
        aria-label={`Increase by ${formatNumber(String(increment), numberFormat)}`}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  )
}
