import { ArrowRight, Check, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import type { ExtractedBeanInfo } from '@/lib/ai'
import type { BeanType, RoastLevel } from '@/lib/constants'
import type { ExtractedRoasterAction } from '@/lib/roaster-match'
import { cn } from '@/lib/utils'

interface FieldDef {
  key: keyof ExtractedBeanInfo
  label: string
  formKey: string
  transform?: (value: string) => string
}

const FIELD_DEFINITIONS: FieldDef[] = [
  { key: 'name', label: 'Name', formKey: 'name' },
  { key: 'type', label: 'Type', formKey: 'type' },
  { key: 'origin', label: 'Country', formKey: 'origin' },
  { key: 'region', label: 'Region', formKey: 'region' },
  { key: 'farm', label: 'Farm/Producer', formKey: 'farm' },
  { key: 'variety', label: 'Variety', formKey: 'variety' },
  {
    key: 'process',
    label: 'Process',
    formKey: 'process',
    transform: (v) => v.replace(/_/g, ' '),
  },
  {
    key: 'roastLevel',
    label: 'Roast Level',
    formKey: 'roastLevel',
    transform: (v) => v.replace(/_/g, ' '),
  },
  { key: 'roastDate', label: 'Roast Date', formKey: 'roastDate' },
  { key: 'notes', label: 'Notes', formKey: 'notes' },
]

export type BeanFormData = BeanFormValues
type Mutable<T> = { -readonly [Key in keyof T]: T[Key] }

interface FieldDiff {
  field: FieldDef
  currentValue: string
  suggestedValue: string
  hasConflict: boolean
}

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
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())

  const diffs = useMemo(() => {
    const result: FieldDiff[] = []

    for (const field of FIELD_DEFINITIONS) {
      const suggestedValue = suggestedData[field.key]
      if (!suggestedValue) continue

      const currentValue = currentData[
        field.formKey as keyof BeanFormData
      ] as string
      const suggested = String(suggestedValue)

      if (currentValue !== suggested) {
        result.push({
          field,
          currentValue: currentValue || '',
          suggestedValue: suggested,
          hasConflict: !!currentValue && currentValue !== suggested,
        })
      }
    }

    return result
  }, [currentData, suggestedData])

  useEffect(() => {
    if (!open) return
    const initial = new Set<string>()
    for (const diff of diffs) {
      if (!diff.hasConflict) {
        initial.add(diff.field.formKey)
      }
    }
    setSelectedFields(initial)
  }, [diffs, open])

  const toggleField = (formKey: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(formKey)) {
        next.delete(formKey)
      } else {
        next.add(formKey)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedFields(new Set(diffs.map((d) => d.field.formKey)))
  }

  const selectNone = () => {
    setSelectedFields(new Set())
  }

  const handleApply = () => {
    const updates: Partial<Mutable<BeanFormData>> = {}

    for (const diff of diffs) {
      if (selectedFields.has(diff.field.formKey)) {
        if (diff.field.formKey === 'roastLevel') {
          updates.roastLevel = diff.suggestedValue as RoastLevel
        } else if (diff.field.formKey === 'type') {
          updates.type = diff.suggestedValue as BeanType
        } else {
          ;(updates as Record<string, string>)[diff.field.formKey] =
            diff.suggestedValue
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

  const conflictCount = diffs.filter((d) => d.hasConflict).length
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
                key={diff.field.formKey}
                diff={diff}
                selected={selectedFields.has(diff.field.formKey)}
                onToggle={() => toggleField(diff.field.formKey)}
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
            <Button variant="ghost" size="sm" onClick={selectNone}>
              Select none
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedFields.size === 0 && !roasterName}
            >
              {applyButtonLabel(
                selectedFields.size,
                roasterName,
                roasterAction,
              )}
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
  diff: FieldDiff
  selected: boolean
  onToggle: () => void
}

function DiffRow({ diff, selected, onToggle }: DiffRowProps) {
  const displayCurrent = diff.field.transform
    ? diff.field.transform(diff.currentValue)
    : diff.currentValue
  const displaySuggested = diff.field.transform
    ? diff.field.transform(diff.suggestedValue)
    : diff.suggestedValue

  return (
    <button
      type="button"
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
            <span className="text-sm font-medium">{diff.field.label}</span>
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
