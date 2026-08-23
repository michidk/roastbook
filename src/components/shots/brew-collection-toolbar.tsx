import { CollectionToolbar } from '@/components/collection-toolbar'
import { SelectField } from '@/components/form/form-field'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { activeFilterCount } from '@/lib/collection-toolbar-labels'

type MethodOption = {
  readonly id: number
  readonly name: string
}

type BrewCollectionToolbarProps = {
  readonly query: string
  readonly methodId: string
  readonly rating: string
  readonly methods: readonly MethodOption[]
  readonly resultLabel: string
  readonly onQueryChange: (query: string) => void
  readonly onMethodChange: (methodId: string) => void
  readonly onRatingChange: (rating: string) => void
  readonly onClearFilters: () => void
}

const RATING_OPTIONS = [
  { value: '0', label: 'Not rated' },
  ...[1, 2, 3, 4, 5].map((rating) => ({
    value: String(rating),
    label: `${rating} star${rating === 1 ? '' : 's'}`,
  })),
]

export function BrewCollectionToolbar({
  query,
  methodId,
  rating,
  methods,
  resultLabel,
  onQueryChange,
  onMethodChange,
  onRatingChange,
  onClearFilters,
}: BrewCollectionToolbarProps) {
  const showRating = useTasteProfile().overallRating

  return (
    <CollectionToolbar
      value={query}
      onValueChange={onQueryChange}
      placeholder="Search brews…"
      ariaLabel="Search brews by bean or method"
      resultLabel={resultLabel}
      filterCount={activeFilterCount(
        showRating ? [methodId, rating] : [methodId],
      )}
      onClearFilters={onClearFilters}
      filters={(idSuffix) => (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-2">
          <SelectField
            id={`brew-method-filter${idSuffix}`}
            label="Method"
            value={methodId}
            onChange={onMethodChange}
            options={methods.map((method) => ({
              value: String(method.id),
              label: method.name,
            }))}
            className="sm:min-w-32"
          />
          {showRating ? (
            <SelectField
              id={`brew-rating-filter${idSuffix}`}
              label="Rating"
              value={rating}
              onChange={onRatingChange}
              options={RATING_OPTIONS}
              className="sm:min-w-28"
            />
          ) : null}
        </div>
      )}
    />
  )
}
