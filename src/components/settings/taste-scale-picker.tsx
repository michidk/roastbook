import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { ExtractionBalanceReadout } from '@/components/shots/extraction-balance-field'
import { ShotSensoryRatingReadout } from '@/components/shots/shot-sensory-ratings'
import { StarRating } from '@/components/ui/star-rating'
import { EXTRACTION_BALANCE_BALANCED } from '@/lib/extraction-balance'
import {
  TASTE_PROFILE_FIELD_META,
  TASTE_PROFILE_SCALE_FIELDS,
  type TasteProfileConfig,
  type TasteProfileField,
} from '@/lib/taste-profile'
import { cn } from '@/lib/utils'

type TasteProfileScale = (typeof TASTE_PROFILE_SCALE_FIELDS)[number]

/**
 * Sample values for the previews. They are deliberately uneven so a card reads
 * as an illustration rather than as a recorded rating.
 */
const PREVIEWS: Record<TasteProfileScale, ReactNode> = {
  overallRating: (
    <StarRating value={4} readOnly sizeClassName="size-5" ariaLabel="Example" />
  ),
  extractionBalance: (
    <ExtractionBalanceReadout value={EXTRACTION_BALANCE_BALANCED} />
  ),
  bitterness: <ShotSensoryRatingReadout ratingKey="bitterness" value={3} />,
  acidity: <ShotSensoryRatingReadout ratingKey="acidity" value={4} />,
  sweetness: <ShotSensoryRatingReadout ratingKey="sweetness" value={4} />,
  body: <ShotSensoryRatingReadout ratingKey="body" value={2} />,
  astringency: <ShotSensoryRatingReadout ratingKey="astringency" value={1} />,
}

/**
 * Picks the scales a brew is rated on. Each card shows the input it switches
 * on, which explains the scale better than prose can.
 */
export function TasteScalePicker({
  config,
  disabled = false,
  onToggle,
}: {
  readonly config: TasteProfileConfig
  readonly disabled?: boolean
  readonly onToggle: (field: TasteProfileField, enabled: boolean) => void
}) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="text-sm font-bold tracking-[0.14em] text-muted-foreground uppercase">
        Rating scales
      </legend>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick the scales a brew is rated on. Each card previews the input it
        adds. Switching one off hides it without deleting values already
        recorded on it.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TASTE_PROFILE_SCALE_FIELDS.map((field) => (
          <ScaleCard
            key={field}
            field={field}
            enabled={config[field]}
            disabled={disabled}
            onToggle={onToggle}
          />
        ))}
      </div>
    </fieldset>
  )
}

function ScaleCard({
  field,
  enabled,
  disabled,
  onToggle,
}: {
  readonly field: TasteProfileScale
  readonly enabled: boolean
  readonly disabled: boolean
  readonly onToggle: (field: TasteProfileField, enabled: boolean) => void
}) {
  const meta = TASTE_PROFILE_FIELD_META[field]
  const descriptionId = `taste-scale-${field}-description`

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={() => onToggle(field, !enabled)}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60',
        enabled
          ? 'border-link/55 bg-secondary/45'
          : 'border-border hover:bg-secondary/25',
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span
          className={cn(
            'min-w-0 truncate text-sm font-semibold',
            !enabled && 'text-muted-foreground',
          )}
        >
          {meta.label}
        </span>
        <span
          aria-hidden
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
            enabled
              ? 'border-link bg-link text-primary-foreground'
              : 'border-muted-foreground/40',
          )}
        >
          {enabled ? <Check className="size-3.5" /> : null}
        </span>
      </span>

      <span id={descriptionId} className="sr-only">
        {meta.description}
      </span>

      <span
        aria-hidden
        className={cn(
          'block min-w-0 transition-opacity',
          !enabled && 'opacity-40 saturate-0',
        )}
      >
        {PREVIEWS[field]}
      </span>
    </button>
  )
}
