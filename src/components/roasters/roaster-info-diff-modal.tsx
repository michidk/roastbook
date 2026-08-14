import { ArrowRight, Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ExtractedRoasterInfo } from '@/lib/ai'
import { cn } from '@/lib/utils'

type RoasterFieldKey = keyof ExtractedRoasterInfo

const FIELDS: readonly {
  key: RoasterFieldKey
  label: string
  format?: (value: string) => string
}[] = [
  { key: 'name', label: 'Name' },
  { key: 'location', label: 'Location' },
  { key: 'country', label: 'Country' },
  { key: 'website', label: 'Website' },
  {
    key: 'instagramHandle',
    label: 'Instagram',
    format: (value) => `@${value.replace(/^@/, '')}`,
  },
  { key: 'notes', label: 'Notes' },
]

type Diff = {
  field: (typeof FIELDS)[number]
  currentValue: string
  suggestedValue: string
  hasConflict: boolean
}

export function RoasterInfoDiffModal({
  currentData,
  onApply,
  onOpenChange,
  open,
  suggestedData,
}: {
  readonly currentData: RoasterFormValues
  readonly onApply: (updates: Partial<RoasterFormValues>) => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly suggestedData: ExtractedRoasterInfo
}) {
  const diffs = useMemo<Diff[]>(() => {
    const result: Diff[] = []
    for (const field of FIELDS) {
      const researchedValue = suggestedData[field.key]
      if (researchedValue === undefined) continue

      const suggestedValue = String(researchedValue)
      const currentValue = currentData[field.key]
      if (currentValue === suggestedValue) continue

      result.push({
        field,
        currentValue,
        suggestedValue,
        hasConflict: currentValue !== '',
      })
    }
    return result
  }, [currentData, suggestedData])

  const [selectedFields, setSelectedFields] = useState<Set<RoasterFieldKey>>(
    new Set(),
  )

  useEffect(() => {
    if (!open) return
    setSelectedFields(
      new Set(
        diffs.filter((diff) => !diff.hasConflict).map((diff) => diff.field.key),
      ),
    )
  }, [diffs, open])

  const toggleField = (key: RoasterFieldKey) => {
    setSelectedFields((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleApply = () => {
    const updates: Partial<RoasterFormValues> = {}
    for (const diff of diffs) {
      if (!selectedFields.has(diff.field.key)) continue
      ;(updates as Record<RoasterFieldKey, string>)[diff.field.key] =
        diff.suggestedValue
    }
    onApply(updates)
    onOpenChange(false)
  }

  const conflictCount = diffs.filter((diff) => diff.hasConflict).length
  const allSelected = diffs.length > 0 && selectedFields.size === diffs.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle>Review roaster details</DialogTitle>
          <DialogDescription>
            {diffs.length === 0
              ? 'The research did not find any details that differ from the current values.'
              : `${diffs.length} suggestion${diffs.length === 1 ? '' : 's'} found${conflictCount > 0 ? ` · ${conflictCount} replace existing values` : ''}`}
          </DialogDescription>
        </DialogHeader>

        {diffs.length > 0 ? (
          <DialogBody>
            <div className="overflow-hidden rounded-xl border bg-card">
              {diffs.map((diff) => {
                const selected = selectedFields.has(diff.field.key)
                const format = diff.field.format ?? ((value: string) => value)
                return (
                  <button
                    key={diff.field.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleField(diff.field.key)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors [&+&]:border-t',
                      selected
                        ? 'bg-primary/[0.06] hover:bg-primary/10'
                        : 'hover:bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40 bg-background',
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>

                    <span className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {diff.field.label}
                        </span>
                        {diff.hasConflict ? (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Existing
                          </span>
                        ) : null}
                      </span>

                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm sm:mt-0 sm:max-w-[60%]">
                        {diff.hasConflict ? (
                          <>
                            <span className="max-w-24 truncate text-muted-foreground line-through">
                              {format(diff.currentValue)}
                            </span>
                            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                          </>
                        ) : null}
                        <span className="truncate font-semibold text-foreground">
                          {format(diff.suggestedValue)}
                        </span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </DialogBody>
        ) : null}

        <DialogFooter className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          {diffs.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="[@media(hover:hover)]:h-8"
              onClick={() =>
                setSelectedFields(
                  allSelected
                    ? new Set()
                    : new Set(diffs.map((diff) => diff.field.key)),
                )
              }
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="[@media(hover:hover)]:h-8"
              onClick={() => onOpenChange(false)}
            >
              {diffs.length === 0 ? 'Close' : 'Cancel'}
            </Button>
            {diffs.length > 0 ? (
              <Button
                type="button"
                size="sm"
                className="[@media(hover:hover)]:h-8"
                onClick={handleApply}
                disabled={selectedFields.size === 0}
              >
                Apply ({selectedFields.size})
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
