import { Search, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CollectionToolbarProps {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly placeholder: string
  readonly ariaLabel: string
  readonly resultLabel?: ReactNode
  readonly actions?: ReactNode
  readonly debounceMs?: number
}

export function CollectionToolbar({
  value,
  onValueChange,
  placeholder,
  ariaLabel,
  resultLabel,
  actions,
  debounceMs = 300,
}: CollectionToolbarProps) {
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
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          placeholder={placeholder}
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
      {resultLabel || actions ? (
        <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {resultLabel ? (
            <p className="text-sm text-muted-foreground">{resultLabel}</p>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}
