import { useMemo } from 'react'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import { SelectableDiffDialog } from '@/components/selectable-diff-dialog'
import {
  buildSelectableDiffs,
  type SelectableDiffDefinition,
} from '@/hooks/use-selectable-diffs'
import type { ExtractedRoasterInfo } from '@/modules/ai/read-models'

type RoasterFieldKey = keyof ExtractedRoasterInfo

const FIELDS: readonly SelectableDiffDefinition<RoasterFieldKey>[] = [
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
  const diffs = useMemo(
    () =>
      buildSelectableDiffs(FIELDS, (field) => {
        const researchedValue = suggestedData[field.key]
        if (researchedValue === undefined) return undefined
        return {
          currentValue: currentData[field.key],
          suggestedValue: researchedValue,
        }
      }),
    [currentData, suggestedData],
  )

  return (
    <SelectableDiffDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Review roaster details"
      emptyDescription="The research did not find any details that differ from the current values."
      diffs={diffs}
      onApply={(selectedDiffs) => {
        const updates: Partial<RoasterFormValues> = {}
        for (const diff of selectedDiffs) {
          ;(updates as Record<RoasterFieldKey, string>)[diff.key] =
            diff.suggestedValue
        }
        onApply(updates)
      }}
    />
  )
}
