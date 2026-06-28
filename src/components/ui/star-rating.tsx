import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  max?: number
  sizeClassName?: string
  className?: string
  readOnly?: boolean
}

function StarRating({
  value,
  onChange,
  max = 5,
  sizeClassName = "size-6",
  className,
  readOnly = false,
}: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= value

        if (readOnly || !onChange) {
          return (
            <Star
              key={starValue}
              className={cn(
                sizeClassName,
                filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              )}
            />
          )
        }

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            className="p-1 transition-transform hover:scale-110"
            aria-label={`Rate ${starValue} out of ${max}`}
          >
            <Star
              className={cn(
                sizeClassName,
                filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export { StarRating }
