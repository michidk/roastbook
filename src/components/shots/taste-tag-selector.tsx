import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
  /**
   * Tags to show before the list is expanded. Selected tags always stay
   * visible. Omit to show every tag.
   */
  readonly featuredIds?: readonly number[]
}

export function TasteTagSelector({
  label,
  tags,
  selected,
  onToggle,
  featuredIds,
}: TasteTagSelectorProps) {
  const [showAll, setShowAll] = useState(false)
  if (tags.length === 0) return null

  const featured = featuredIds ? new Set(featuredIds) : null
  const visibleTags =
    featured && !showAll
      ? tags.filter((tag) => featured.has(tag.id) || selected.includes(tag.id))
      : tags
  const canCollapse = featured !== null && featured.size < tags.length

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map((tag) => {
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
      {canCollapse ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-expanded={showAll}
          onClick={() => setShowAll((current) => !current)}
          className="-ml-2.5"
        >
          {showAll ? 'Show fewer tags' : `Show all ${tags.length} tags`}
        </Button>
      ) : null}
    </div>
  )
}
