import {
  Bean,
  Candy,
  Citrus,
  DropletOff,
  Info,
  Leaf,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  SHOT_SENSORY_RATING_KEYS,
  SHOT_SENSORY_RATING_META,
  type ShotSensoryRatingKey,
  type ShotSensoryRatings,
} from '@/lib/shot-sensory'
import { cn } from '@/lib/utils'

const ICONS = {
  bitterness: Leaf,
  acidity: Citrus,
  sweetness: Candy,
  body: Bean,
  astringency: DropletOff,
} as const satisfies Record<ShotSensoryRatingKey, LucideIcon>

type ShotSensoryRatingFieldsProps = {
  readonly values: ShotSensoryRatings
  readonly onChange?: (key: ShotSensoryRatingKey, value: number) => void
  readonly readOnly?: boolean
}

export function ShotSensoryRatingFields({
  values,
  onChange,
  readOnly = false,
}: ShotSensoryRatingFieldsProps) {
  const visibleKeys = readOnly
    ? SHOT_SENSORY_RATING_KEYS.filter((key) => values[key] > 0)
    : SHOT_SENSORY_RATING_KEYS

  if (visibleKeys.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleKeys.map((key) => {
        const meta = SHOT_SENSORY_RATING_META[key]
        const Icon = ICONS[key]
        const value = values[key]

        return (
          <div
            key={key}
            className="min-w-0 rounded-xl border border-border bg-secondary/35 p-3"
          >
            <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Icon aria-hidden className="size-4 shrink-0 text-link" />
                <p className="text-sm font-semibold">{meta.label}</p>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`About ${meta.label.toLowerCase()}`}
                  >
                    <Info aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="leading-relaxed">
                  {meta.hint}
                </TooltipContent>
              </Tooltip>
            </div>

            {readOnly ? (
              <div
                role="img"
                aria-label={`${meta.label}: ${value} out of 5`}
                className="flex items-center gap-1"
              >
                {Array.from({ length: 5 }, (_, index) => index + 1).map(
                  (level) => (
                    <Icon
                      key={level}
                      aria-hidden
                      className={cn(
                        'size-4',
                        level <= value
                          ? 'fill-link/20 text-link'
                          : 'text-muted-foreground/35',
                      )}
                    />
                  ),
                )}
                <span className="ml-1 text-sm font-semibold tabular-nums">
                  {value}/5
                </span>
              </div>
            ) : (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="sr-only">{meta.label} intensity</legend>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, index) => index + 1).map(
                    (level) => {
                      const filled = level <= value
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            onChange?.(key, level === value ? 0 : level)
                          }
                          aria-label={`Set ${meta.label.toLowerCase()} to ${level} out of 5`}
                          aria-pressed={level === value}
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:size-8',
                            filled
                              ? 'bg-primary/20 text-link'
                              : 'text-muted-foreground hover:bg-secondary',
                          )}
                        >
                          <Icon
                            aria-hidden
                            className={cn(
                              'size-5',
                              filled && 'fill-current/15',
                            )}
                          />
                        </button>
                      )
                    },
                  )}
                </div>
                <div className="mt-1 flex max-w-[12.5rem] justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>{value === 0 ? 'Not rated' : `${value}/5`}</span>
                  <span>High</span>
                </div>
              </fieldset>
            )}
          </div>
        )
      })}
    </div>
  )
}
