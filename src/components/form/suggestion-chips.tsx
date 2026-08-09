import { Button } from "@/components/ui/button"

type Suggestion = {
  readonly id: number
  readonly name: string
}

type SuggestionChipsProps = {
  readonly label: string
  readonly items: readonly Suggestion[]
  readonly value: string
  readonly onChange: (value: string) => void
}

export function SuggestionChips({
  label,
  items,
  value,
  onChange,
}: SuggestionChipsProps) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">
        Suggestions
      </p>
      <div
        role="group"
        aria-label={`${label} suggestions`}
        className="flex flex-wrap gap-2"
      >
        {items.map((item) => {
          const isSelected = String(item.id) === value
          return (
            <Button
              key={item.id}
              type="button"
              size="xs"
              variant={isSelected ? "primary" : "secondary"}
              aria-pressed={isSelected}
              onClick={() => onChange(String(item.id))}
              className="rounded-xl"
            >
              {item.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
