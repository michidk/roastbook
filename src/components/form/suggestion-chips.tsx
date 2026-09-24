import { Button } from '@/components/ui/button'

export type PickerSuggestion = {
  readonly id: number | string
  readonly name: string
  readonly description?: string
}

type SuggestionChipsProps = {
  readonly label: string
  readonly items: readonly PickerSuggestion[]
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
      <p className="text-xs font-semibold text-muted-foreground">Suggestions</p>
      {/* Phones get one swipeable row so rich chips (bean bags, gear sets)
          do not stack into a column taller than the picker they shortcut. */}
      <fieldset className="-my-1 flex min-w-0 snap-x gap-2 overflow-x-auto border-0 p-0 py-1 sm:flex-wrap sm:overflow-visible">
        <legend className="sr-only">{label} suggestions</legend>
        {items.map((item) => {
          const isSelected = String(item.id) === value
          return (
            <Button
              key={item.id}
              type="button"
              size="xs"
              variant={isSelected ? 'primary' : 'secondary'}
              aria-pressed={isSelected}
              onClick={() => onChange(String(item.id))}
              className="h-auto min-h-11 max-w-[85%] shrink-0 snap-start rounded-xl py-2 text-left whitespace-normal sm:max-w-none sm:shrink [@media(hover:hover)_and_(pointer:fine)]:min-h-8"
            >
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span>{item.name}</span>
                {item.description ? (
                  <span className="font-normal text-current/70">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </Button>
          )
        })}
      </fieldset>
    </div>
  )
}
