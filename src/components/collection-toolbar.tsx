import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'

interface CollectionToolbarProps {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly placeholder: string
  readonly ariaLabel: string
  readonly resultLabel?: ReactNode
  readonly actions?: ReactNode
}

export function CollectionToolbar({
  value,
  onValueChange,
  placeholder,
  ariaLabel,
  resultLabel,
  actions,
}: CollectionToolbarProps) {
  return (
    <div
      data-slot="collection-toolbar"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="relative w-full sm:max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="pl-9"
        />
      </div>
      {resultLabel || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          {resultLabel ? (
            <p className="text-sm text-muted-foreground">{resultLabel}</p>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}
