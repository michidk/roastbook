import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type TasteTag = {
  readonly id: number
  readonly name: string
  readonly hint?: string | null
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
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isSelected = selected.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={isSelected}
              title={tag.hint ?? undefined}
              onClick={() => onToggle(tag.id)}
              className="group/tag flex min-h-11 items-center rounded-lg text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:min-h-8"
            >
              <span
                className={cn(
                  'rounded-lg border px-2.5 py-1',
                  isSelected
                    ? 'border-foreground bg-primary text-primary-foreground'
                    : 'border-border bg-secondary group-hover/tag:bg-primary/10',
                )}
              >
                {tag.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
