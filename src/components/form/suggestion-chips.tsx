import { Button } from '@roastbook/ui/button'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PickerSuggestion = {
  readonly id: number | string
  readonly name: string
  readonly description?: string
  readonly leading?: ReactNode
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
      {/* One swipeable row at every width, with a visible scrollbar, so rich
          chips (bean bags, gear sets) never stack taller than their picker. */}
      <fieldset className="-my-1 flex min-w-0 snap-x gap-2 overflow-x-auto border-0 p-0 py-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
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
              className={cn(
                'h-auto min-h-11 max-w-64 shrink-0 snap-start rounded-xl py-1.5 text-left [@media(hover:hover)_and_(pointer:fine)]:min-h-8',
                item.leading &&
                  'min-h-11 gap-2 py-1 pr-3 pl-1.5 [@media(hover:hover)_and_(pointer:fine)]:min-h-10',
              )}
            >
              {item.leading}
              <span className="flex min-w-0 flex-col items-start">
                <span className="max-w-full truncate">{item.name}</span>
                {item.description ? (
                  <span className="max-w-full truncate font-normal text-current/70">
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
