import { ArrowRight, Check } from 'lucide-react'
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
import {
  type SelectableDiff,
  useSelectableDiffs,
} from '@/hooks/use-selectable-diffs'
import { cn } from '@/lib/utils'

type SelectableDiffDialogProps<Key extends string> = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly emptyDescription: string
  readonly diffs: readonly SelectableDiff<Key>[]
  readonly onApply: (diffs: readonly SelectableDiff<Key>[]) => void
}

export function SelectableDiffDialog<Key extends string>({
  open,
  onOpenChange,
  title,
  emptyDescription,
  diffs,
  onApply,
}: SelectableDiffDialogProps<Key>) {
  const {
    selectedKeys,
    toggle,
    selectAll,
    clearAll,
    allSelected,
    conflictCount,
  } = useSelectableDiffs(open, diffs)

  const handleApply = () => {
    onApply(diffs.filter((diff) => selectedKeys.has(diff.key)))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {diffs.length === 0
              ? emptyDescription
              : `${diffs.length} suggestion${diffs.length === 1 ? '' : 's'} found${conflictCount > 0 ? ` · ${conflictCount} replace existing values` : ''}`}
          </DialogDescription>
        </DialogHeader>

        {diffs.length > 0 ? (
          <DialogBody>
            <div className="overflow-hidden rounded-xl border bg-card">
              {diffs.map((diff) => {
                const selected = selectedKeys.has(diff.key)
                const format = diff.format ?? ((value: string) => value)

                return (
                  <button
                    key={diff.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(diff.key)}
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
                          {diff.label}
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
              onClick={allSelected ? clearAll : selectAll}
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
                disabled={selectedKeys.size === 0}
              >
                Apply ({selectedKeys.size})
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
