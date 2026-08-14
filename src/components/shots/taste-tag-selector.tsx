import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type TasteTag = {
  readonly id: number
  readonly name: string
}

type TasteTagSelectorProps = {
  readonly label: string
  readonly tags: readonly TasteTag[]
  readonly selected: readonly number[]
  readonly onToggle: (id: number) => void
}

export function TasteTagSelector({
  label,
  tags,
  selected,
  onToggle,
}: TasteTagSelectorProps) {
  if (tags.length === 0) return null
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selected.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(tag.id)}
              className={cn(
                'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                isSelected
                  ? 'border-foreground bg-primary text-primary-foreground'
                  : 'border-border bg-secondary',
              )}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
