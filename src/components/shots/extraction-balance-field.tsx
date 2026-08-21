import { Citrus, Info, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  EXTRACTION_BALANCE_BALANCED,
  EXTRACTION_BALANCE_LEVELS,
  EXTRACTION_BALANCE_META,
  extractionBalanceLabel,
} from '@/lib/extraction-balance'
import { cn } from '@/lib/utils'

type ExtractionBalanceFieldProps = {
  /** 1–5 along the sour-to-bitter axis, or 0 when nothing is recorded. */
  readonly value: number
  readonly onChange?: (value: number) => void
  readonly readOnly?: boolean
}

export function ExtractionBalanceField({
  value,
  onChange,
  readOnly = false,
}: ExtractionBalanceFieldProps) {
  const selectedLabel = extractionBalanceLabel(value)

  if (readOnly && !selectedLabel) return null

  return (
    <div className="min-w-0 rounded-xl border border-border bg-secondary/35 p-3">
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
        <p className="text-sm font-semibold">{EXTRACTION_BALANCE_META.label}</p>
        <Tooltip>
          <TooltipTrigger>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`About ${EXTRACTION_BALANCE_META.label.toLowerCase()}`}
            >
              <Info aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="leading-relaxed">
            {EXTRACTION_BALANCE_META.hint}
          </TooltipContent>
        </Tooltip>
      </div>

      {readOnly ? (
        <BalanceReadout value={value} label={selectedLabel} />
      ) : (
        <BalancePicker
          value={value}
          label={selectedLabel}
          onChange={onChange}
        />
      )}
    </div>
  )
}

function BalanceReadout({
  value,
  label,
}: {
  readonly value: number
  readonly label: string | null
}) {
  return (
    <div className="flex items-center gap-2">
      <Citrus aria-hidden className="size-4 shrink-0 text-link" />
      <div
        role="img"
        aria-label={`${EXTRACTION_BALANCE_META.label}: ${label}`}
        className="flex items-center gap-1"
      >
        {EXTRACTION_BALANCE_LEVELS.map((level) => (
          <span
            key={level}
            aria-hidden
            className={cn(
              'size-2.5 rounded-full',
              level === value ? 'bg-link' : 'bg-muted-foreground/25',
            )}
          />
        ))}
      </div>
      <Leaf aria-hidden className="size-4 shrink-0 text-link" />
      <span className="ml-1 text-sm font-semibold">{label}</span>
    </div>
  )
}

function BalancePicker({
  value,
  label,
  onChange,
}: {
  readonly value: number
  readonly label: string | null
  readonly onChange?: (value: number) => void
}) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">{EXTRACTION_BALANCE_META.label}</legend>
      <div className="flex items-center gap-1">
        <Citrus aria-hidden className="size-4 shrink-0 text-link" />
        {EXTRACTION_BALANCE_LEVELS.map((level) => {
          const isSelected = level === value
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange?.(isSelected ? 0 : level)}
              aria-label={`Set the balance to ${extractionBalanceLabel(level)?.toLowerCase()}`}
              aria-pressed={isSelected}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:size-8',
                isSelected
                  ? 'bg-primary/20 text-link'
                  : 'text-muted-foreground hover:bg-secondary',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'rounded-full',
                  isSelected
                    ? 'size-3.5 bg-link'
                    : 'size-2.5 bg-current opacity-40',
                  level === EXTRACTION_BALANCE_BALANCED &&
                    !isSelected &&
                    'opacity-70',
                )}
              />
            </button>
          )
        })}
        <Leaf aria-hidden className="size-4 shrink-0 text-link" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{EXTRACTION_BALANCE_META.sourLabel}</span>
        <span className="font-medium">{label ?? 'Not recorded'}</span>
        <span>{EXTRACTION_BALANCE_META.bitterLabel}</span>
      </div>
    </fieldset>
  )
}
