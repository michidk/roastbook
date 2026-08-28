import { Search, SlidersHorizontal, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { collectionSearchPlaceholder } from '@/lib/collection-toolbar-labels'
import { cn } from '@/lib/utils'

interface CollectionToolbarProps {
  readonly value?: string
  readonly onValueChange?: (value: string) => void
  readonly placeholder?: string
  readonly ariaLabel?: string
  /** Short count phrase such as `186 brews`; also carried by the placeholder. */
  readonly resultLabel?: string
  /** Inline at every width: view toggles and other always-visible controls. */
  readonly actions?: ReactNode
  /** Controls that sit beside the search field below `sm`. */
  readonly mobileSearchActions?: ReactNode
  /**
   * Filter controls, rendered inline from `sm` and inside the mobile filter
   * sheet. The suffix keeps control ids unique across the two copies.
   */
  readonly filters?: (idSuffix: string) => ReactNode
  readonly filterCount?: number
  readonly onClearFilters?: () => void
  readonly debounceMs?: number
}

const ignoreValueChange = () => undefined

export function CollectionToolbar({
  value = '',
  onValueChange = ignoreValueChange,
  placeholder = '',
  ariaLabel = '',
  resultLabel,
  actions,
  mobileSearchActions,
  filters,
  filterCount = 0,
  onClearFilters,
  debounceMs = 300,
}: CollectionToolbarProps) {
  const showSearch = Boolean(placeholder && ariaLabel)
  const [draftValue, setDraftValue] = useState(value)
  const onValueChangeRef = useRef(onValueChange)
  const lastEmittedValue = useRef(value)

  useEffect(() => {
    onValueChangeRef.current = onValueChange
  }, [onValueChange])

  useEffect(() => {
    setDraftValue(value)
    lastEmittedValue.current = value
  }, [value])

  useEffect(() => {
    if (draftValue === value || draftValue === lastEmittedValue.current) return
    const timeout = window.setTimeout(() => {
      lastEmittedValue.current = draftValue
      onValueChangeRef.current(draftValue)
    }, debounceMs)
    return () => window.clearTimeout(timeout)
  }, [debounceMs, draftValue, value])

  // A phone only spends height on the count once the collection is narrowed;
  // until then the placeholder carries it and the line stays screen-reader
  // only.
  const isNarrowed = draftValue !== '' || filterCount > 0

  return (
    <div
      data-slot="collection-toolbar"
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <div className="flex w-full items-center gap-2 sm:max-w-sm">
        {showSearch ? (
          <div className="relative w-full">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              placeholder={collectionSearchPlaceholder(
                placeholder,
                resultLabel,
              )}
              aria-label={ariaLabel}
              className="pr-11 pl-9"
            />
            {draftValue ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Clear ${ariaLabel.toLowerCase()}`}
                className="absolute top-1/2 right-0 -translate-y-1/2"
                onClick={() => {
                  setDraftValue('')
                  lastEmittedValue.current = ''
                  onValueChangeRef.current('')
                }}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ) : null}
        {filters ? (
          <CollectionFilterSheet
            filters={filters}
            filterCount={filterCount}
            onClearFilters={onClearFilters}
            resultLabel={resultLabel}
          />
        ) : null}
        {mobileSearchActions ? (
          <div className="flex shrink-0 items-center sm:hidden">
            {mobileSearchActions}
          </div>
        ) : null}
      </div>

      {resultLabel ? (
        <p
          aria-live="polite"
          className={cn(
            'text-[13px] text-muted-foreground sm:hidden',
            !isNarrowed && 'sr-only',
          )}
        >
          {resultLabel}
        </p>
      ) : null}

      {resultLabel || actions || filters ? (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 sm:justify-end',
            !actions && 'max-sm:hidden',
            mobileSearchActions && 'max-sm:hidden',
          )}
        >
          {resultLabel ? (
            <p className="hidden text-sm text-muted-foreground sm:block">
              {resultLabel}
            </p>
          ) : null}
          {filters ? (
            <div className="hidden min-w-0 sm:block">{filters('')}</div>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}

function CollectionFilterSheet({
  filters,
  filterCount,
  onClearFilters,
  resultLabel,
}: {
  readonly filters: (idSuffix: string) => ReactNode
  readonly filterCount: number
  readonly onClearFilters?: () => void
  readonly resultLabel?: string
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative shrink-0 sm:hidden"
            aria-label={
              filterCount > 0
                ? `Filters, ${filterCount} active`
                : 'Filters, none active'
            }
          />
        }
      >
        <SlidersHorizontal aria-hidden />
        {filterCount > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground"
          >
            {filterCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          {resultLabel ? (
            <SheetDescription>Showing {resultLabel}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="min-w-0 space-y-4 overflow-y-auto px-4">
          {filters('-sheet')}
        </div>
        <SheetFooter className="flex-row">
          {onClearFilters && filterCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClearFilters}
            >
              Clear all
            </Button>
          ) : null}
          <SheetClose render={<Button type="button" className="flex-1" />}>
            Done
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
