import type { ReactNode } from 'react'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { SelectField } from '@/components/form/form-field'

type MethodOption = {
  readonly id: number
  readonly name: string
}

type BrewCollectionToolbarProps = {
  readonly query: string
  readonly methodId: string
  readonly rating: string
  readonly methods: readonly MethodOption[]
  readonly resultLabel: ReactNode
  readonly onQueryChange: (query: string) => void
  readonly onMethodChange: (methodId: string) => void
  readonly onRatingChange: (rating: string) => void
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
}: BrewCollectionToolbarProps) {
  return (
    <CollectionToolbar
      value={query}
      onValueChange={onQueryChange}
      placeholder="Search brews…"
      ariaLabel="Search brews by bean or method"
      resultLabel={resultLabel}
      actions={
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:w-auto sm:gap-2">
          <SelectField
            id="brew-method-filter"
            label="Method"
            value={methodId}
            onChange={onMethodChange}
            options={methods.map((method) => ({
              value: String(method.id),
              label: method.name,
            }))}
            className="w-full min-w-0 sm:min-w-32"
          />
          <SelectField
            id="brew-rating-filter"
            label="Rating"
            value={rating}
            onChange={onRatingChange}
            options={RATING_OPTIONS}
            className="w-full min-w-0 sm:min-w-28"
          />
        </div>
      }
    />
  )
}
