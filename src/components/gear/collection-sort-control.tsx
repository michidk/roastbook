import { ArrowDown, ArrowUp } from 'lucide-react'
import { SelectField } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import type { SortDirection } from '@/lib/collection-sort'

interface SortOption<Key extends string> {
  readonly value: Key
  readonly label: string
}

interface CollectionSortControlProps<Key extends string> {
  readonly id: string
  readonly options: readonly SortOption<Key>[]
  readonly sort: Key
  readonly direction: SortDirection
  readonly onSortChange: (sort: Key) => void
  readonly onDirectionToggle: () => void
}

/**
 * Sort key select with a direction toggle for card-grid collections, which
 * have no sortable table headers. Rendered through the collection toolbar's
 * filter slot so it stays inline on desktop and moves into the sheet on
 * phones.
 */
export function CollectionSortControl<Key extends string>({
  id,
  options,
  sort,
  direction,
  onSortChange,
  onDirectionToggle,
}: CollectionSortControlProps<Key>) {
  return (
    <div className="flex items-end gap-2">
      <SelectField
        id={id}
        label="Sort by"
        required
        value={sort}
        onChange={(value) => {
          const next = options.find((option) => option.value === value)
          if (next) onSortChange(next.value)
        }}
        options={options}
        className="min-w-0 flex-1 sm:min-w-36"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={
          direction === 'asc'
            ? 'Sorted ascending, switch to descending'
            : 'Sorted descending, switch to ascending'
        }
        onClick={onDirectionToggle}
      >
        {direction === 'asc' ? (
          <ArrowUp aria-hidden="true" />
        ) : (
          <ArrowDown aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}
