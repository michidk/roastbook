import { Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type StarRatingProps = {
  readonly value: number
  readonly onChange?: (value: number) => void
  readonly max?: number
  readonly sizeClassName?: string
  readonly className?: string
  readonly readOnly?: boolean
  readonly ariaLabel?: string
  readonly variant?: 'stars' | 'compact'
}

function StarRating({
  value,
  onChange,
  max = 5,
  sizeClassName = 'size-6',
  className,
  readOnly = false,
  ariaLabel = 'Rating',
  variant = 'stars',
}: StarRatingProps) {
  if (readOnly || !onChange) {
    if (variant === 'compact') {
      return (
        <span
          role="img"
          aria-label={`${ariaLabel}: ${value} out of ${max}`}
          className={cn(
            'inline-flex items-center gap-1 font-semibold tabular-nums text-link',
            className,
          )}
        >
          <Star aria-hidden className={cn('fill-current', sizeClassName)} />
          <span>
            {value}/{max}
          </span>
        </span>
      )
    }

    return (
      <span
        role="img"
        aria-label={`${ariaLabel}: ${value} out of ${max}`}
        className={cn('flex items-center gap-1', className)}
      >
        {Array.from({ length: max }, (_, index) => index + 1).map(
          (starValue) => (
            <Star
              aria-hidden
              key={starValue}
              className={cn(
                sizeClassName,
                starValue <= value
                  ? 'fill-link text-link'
                  : 'text-muted-foreground',
              )}
            />
          ),
        )}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <fieldset className="flex min-w-0 items-center gap-0 border-0 p-0 sm:gap-1">
        <legend className="sr-only">{ariaLabel}</legend>
        {Array.from({ length: max }, (_, index) => {
          const starValue = index + 1
          const filled = starValue <= value

          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange(starValue === value ? 0 : starValue)}
              className="flex size-11 shrink-0 items-center justify-center transition-transform motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:size-8 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-110"
              aria-label={`Rate ${starValue} out of ${max}`}
              aria-pressed={starValue === value}
            >
              <Star
                aria-hidden
                className={cn(
                  sizeClassName,
                  filled ? 'fill-link text-link' : 'text-muted-foreground',
                )}
              />
            </button>
          )
        })}
      </fieldset>
      {value === 0 ? (
        <span className="text-sm text-muted-foreground">Not rated</span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(0)}
        >
          Clear rating
        </Button>
      )}
    </div>
  )
}

export { StarRating }
