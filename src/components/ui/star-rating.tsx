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
        {Array.from({ length: max }, (_, index) => (
          <Star
            aria-hidden
            key={index + 1}
            className={cn(
              sizeClassName,
              index < value ? "fill-primary text-primary" : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex items-center gap-0 sm:gap-1", className)}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= value

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            className="flex size-11 shrink-0 items-center justify-center transition-transform hover:scale-110 sm:size-8"
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
    </div>
  )
}

export { StarRating }
