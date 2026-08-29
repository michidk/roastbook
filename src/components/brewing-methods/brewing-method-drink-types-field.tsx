import { Toggle } from '@/components/ui/toggle'
import type { DrinkTypeOption } from '@/lib/drink-options'
import { cn } from '@/lib/utils'

export function BrewingMethodDrinkTypesField({
  drinkTypes,
  value,
  onChange,
}: {
  readonly drinkTypes: readonly DrinkTypeOption[]
  readonly value: readonly number[]
  readonly onChange: (value: readonly number[]) => void
}) {
  const toggle = (id: number, pressed: boolean) =>
    onChange(
      pressed ? [...value, id] : value.filter((currentId) => currentId !== id),
    )

  if (drinkTypes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add drink types in Settings before limiting this method.
      </p>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {drinkTypes.map((drinkType) => {
        const isSelected = value.includes(drinkType.id)
        return (
          <Toggle
            key={drinkType.id}
            variant="outline"
            size="lg"
            pressed={isSelected}
            onPressedChange={(pressed) => toggle(drinkType.id, pressed)}
            className={cn(
              'h-auto min-h-11 justify-start px-3 py-2',
              isSelected &&
                'aria-pressed:border-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:aria-pressed:bg-primary/90 hover:aria-pressed:text-primary-foreground',
            )}
          >
            {drinkType.name}
          </Toggle>
        )
      })}
    </div>
  )
}
