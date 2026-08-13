import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

type StarRatingProps = {
  readonly value: number
  readonly onChange?: (value: number) => void
  readonly max?: number
  readonly sizeClassName?: string
  readonly className?: string
  readonly readOnly?: boolean
  readonly ariaLabel?: string
}

function StarRating({
  value,
  onChange,
  max = 5,
  sizeClassName = "size-6",
  className,
  readOnly = false,
  ariaLabel = "Rating",
}: StarRatingProps) {
  if (readOnly || !onChange) {
    return (
      <div
        role="img"
        aria-label={`${ariaLabel}: ${value} out of ${max}`}
        className={cn("flex items-center gap-1", className)}
      >
        {Array.from({ length: max }, (_, index) => index + 1).map((starValue) => (
          <Star
            aria-hidden
            key={starValue}
            className={cn(
              sizeClassName,
              starValue <= value ? "fill-primary text-primary" : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <fieldset className={cn("flex min-w-0 items-center gap-0 border-0 p-0 sm:gap-1", className)}>
      <legend className="sr-only">{ariaLabel}</legend>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= value

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            className="flex size-11 shrink-0 items-center justify-center transition-transform hover:scale-110 lg:size-8"
            aria-label={`Rate ${starValue} out of ${max}`}
            aria-pressed={starValue === value}
          >
            <Star
              aria-hidden
              className={cn(
                sizeClassName,
                filled ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </button>
        )
      })}
    </fieldset>
  )
}

export { StarRating }
