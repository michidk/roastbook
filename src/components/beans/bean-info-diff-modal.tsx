import { ArrowRight, Check, Store } from 'lucide-react'
import { useMemo } from 'react'
import type { BeanFormValues } from '@/components/beans/bean-form-values'
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
  buildSelectableDiffs,
  type SelectableDiff,
  type SelectableDiffDefinition,
  useSelectableDiffs,
} from '@/hooks/use-selectable-diffs'
import type { BeanType, RoastLevel } from '@/lib/constants'
import type { ExtractedRoasterAction } from '@/lib/roaster-match'
import { cn } from '@/lib/utils'
import type { ExtractedBeanInfo } from '@/modules/ai/read-models'

type BeanDiffKey =
  | 'name'
  | 'type'
  | 'origin'
  | 'region'
  | 'farm'
  | 'variety'
  | 'process'
  | 'roastLevel'
  | 'roastDate'
  | 'notes'

interface FieldDef extends SelectableDiffDefinition<BeanDiffKey> {
  sourceKey: keyof ExtractedBeanInfo
}

const FIELD_DEFINITIONS: FieldDef[] = [
  { key: 'name', sourceKey: 'name', label: 'Name' },
  { key: 'type', sourceKey: 'type', label: 'Type' },
  { key: 'origin', sourceKey: 'origin', label: 'Country' },
  { key: 'region', sourceKey: 'region', label: 'Region' },
  { key: 'farm', sourceKey: 'farm', label: 'Farm/Producer' },
  { key: 'variety', sourceKey: 'variety', label: 'Variety' },
  {
    key: 'process',
    sourceKey: 'process',
    label: 'Process',
    format: (v) => v.replace(/_/g, ' '),
  },
  {
    key: 'roastLevel',
    sourceKey: 'roastLevel',
    label: 'Roast Level',
    format: (v) => v.replace(/_/g, ' '),
  },
  { key: 'roastDate', sourceKey: 'roastDate', label: 'Roast Date' },
  { key: 'notes', sourceKey: 'notes', label: 'Notes' },
]

export type BeanFormData = BeanFormValues
type Mutable<T> = { -readonly [Key in keyof T]: T[Key] }

interface BeanInfoDiffModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentData: BeanFormData
  suggestedData: ExtractedBeanInfo
  onApply: (updates: Partial<BeanFormData>) => void
  onReviewRoaster?: (name: string) => void
  roasterAction: ExtractedRoasterAction | null
  source: 'image' | 'web'
}

export function BeanInfoDiffModal({
  open,
  onOpenChange,
  currentData,
  suggestedData,
  onApply,
  onReviewRoaster,
  roasterAction,
  source,
}: BeanInfoDiffModalProps) {
  const diffs = useMemo(
    () =>
      buildSelectableDiffs(FIELD_DEFINITIONS, (field) => {
        const suggestedValue = suggestedData[field.sourceKey]
        if (!suggestedValue) return undefined
        return {
          currentValue: currentData[field.key],
          suggestedValue,
        }
      }),
    [currentData, suggestedData],
  )
  const { selectedKeys, toggle, selectAll, clearAll, conflictCount } =
    useSelectableDiffs(open, diffs)

  const handleApply = () => {
    const updates: Partial<Mutable<BeanFormData>> = {}

    for (const diff of diffs) {
      if (selectedKeys.has(diff.key)) {
        if (diff.key === 'roastLevel') {
          updates.roastLevel = diff.suggestedValue as RoastLevel
        } else if (diff.key === 'type') {
          updates.type = diff.suggestedValue as BeanType
        } else {
          ;(updates as Record<string, string>)[diff.key] = diff.suggestedValue
        }
      }
    }

    onApply(updates)
    onOpenChange(false)
    const roasterName = suggestedData.roaster?.trim()
    if (
      roasterName &&
      (roasterAction === 'create' || roasterAction === 'link')
    ) {
      onReviewRoaster?.(roasterName)
    }
  }

  const newFieldCount = diffs.filter((d) => !d.hasConflict).length
  const roasterName = suggestedData.roaster?.trim()

  if (diffs.length === 0 && !roasterName) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No Changes Found</DialogTitle>
            <DialogDescription>
              {source === 'image'
                ? "The AI couldn't extract any new information from the image."
                : "The AI couldn't find any new information about this bean online."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {source === 'image'
              ? 'Review extracted info'
              : 'Review research results'}
          </DialogTitle>
          <DialogDescription>
            {newFieldCount > 0 && (
              <span className="text-positive-text">
                {newFieldCount} new field{newFieldCount !== 1 ? 's' : ''}
              </span>
            )}
            {newFieldCount > 0 && conflictCount > 0 && ' · '}
            {conflictCount > 0 && (
              <span className="text-link">
                {conflictCount} field{conflictCount !== 1 ? 's' : ''} with
                existing values
              </span>
            )}
            {roasterName && (newFieldCount > 0 || conflictCount > 0) && ' · '}
            {roasterName && (
              <span>
                {roasterAction === 'create'
                  ? 'new roaster to create'
                  : roasterAction === 'link'
                    ? 'existing roaster to link'
                    : 'roaster already linked'}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-2">
            {diffs.map((diff) => (
              <DiffRow
                key={diff.key}
                diff={diff}
                selected={selectedKeys.has(diff.key)}
                onToggle={() => toggle(diff.key)}
              />
            ))}
            {roasterName ? (
              <div className="flex items-start gap-3 rounded-lg border bg-secondary/60 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  <Store className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {roasterAction === 'create'
                      ? 'New roaster found'
                      : roasterAction === 'link'
                        ? 'Existing roaster found'
                        : 'Roaster already linked'}
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {roasterName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {roasterAction === 'create'
                      ? "You'll review its details, then create and link it to this coffee."
                      : roasterAction === 'link'
                        ? "You'll confirm linking this coffee to the existing roaster."
                        : 'This coffee already uses the extracted roaster. No roaster changes are needed.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Select none
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedKeys.size === 0 && !roasterName}
            >
              {applyButtonLabel(selectedKeys.size, roasterName, roasterAction)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function applyButtonLabel(
  selectedFieldCount: number,
  roasterName: string | undefined,
  roasterAction: ExtractedRoasterAction | null,
) {
  const changeLabel = `${selectedFieldCount} change${selectedFieldCount !== 1 ? 's' : ''}`
  if (!roasterName) return `Apply ${changeLabel}`

  if (roasterAction === 'create') {
    return selectedFieldCount > 0
      ? `Apply ${changeLabel} and create roaster`
      : 'Create roaster'
  }
  if (roasterAction === 'link') {
    return selectedFieldCount > 0
      ? `Apply ${changeLabel} and link roaster`
      : 'Link roaster'
  }
  return selectedFieldCount > 0 ? `Apply ${changeLabel}` : 'Done'
}

interface DiffRowProps {
  diff: SelectableDiff<BeanDiffKey>
  selected: boolean
  onToggle: () => void
}

function DiffRow({ diff, selected, onToggle }: DiffRowProps) {
  const displayCurrent = diff.format
    ? diff.format(diff.currentValue)
    : diff.currentValue
  const displaySuggested = diff.format
    ? diff.format(diff.suggestedValue)
    : diff.suggestedValue

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30',
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{diff.label}</span>
            {diff.hasConflict && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-link">
                has value
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            {diff.hasConflict ? (
              <>
                <span className="text-muted-foreground line-through truncate max-w-[40%]">
                  {displayCurrent || '(empty)'}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate max-w-[40%]">
                  {displaySuggested}
                </span>
              </>
            ) : (
              <span className="truncate text-positive-text">
                {displaySuggested}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
