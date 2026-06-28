import { useState, useMemo } from "react"
import { Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { ExtractedBeanInfo } from "@/lib/ai"
import type { RoastLevel } from "@/lib/constants"

interface FieldDef {
  key: keyof ExtractedBeanInfo
  label: string
  formKey: string
  transform?: (value: string) => string
}

const FIELD_DEFINITIONS: FieldDef[] = [
  { key: "name", label: "Name", formKey: "name" },
  { key: "origin", label: "Country", formKey: "origin" },
  { key: "region", label: "Region", formKey: "region" },
  { key: "farm", label: "Farm/Producer", formKey: "farm" },
  { key: "variety", label: "Variety", formKey: "variety" },
  {
    key: "process",
    label: "Process",
    formKey: "process",
    transform: (v) => v.replace(/_/g, " "),
  },
  {
    key: "roastLevel",
    label: "Roast Level",
    formKey: "roastLevel",
    transform: (v) => v.replace(/_/g, " "),
  },
  { key: "roastDate", label: "Roast Date", formKey: "roastDate" },
  { key: "notes", label: "Notes", formKey: "notes"   },
]

export interface BeanFormData {
  name: string
  roasterId: string
  weight: string
  price: string
  priceCurrency: string
  shopUrl: string
  origin: string
  region: string
  farm: string
  variety: string
  process: string
  roastLevel: RoastLevel | ""
  roastDate: string
  notes: string
}

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
  source: "image" | "web"
}

export function BeanInfoDiffModal({
  open,
  onOpenChange,
  currentData,
  suggestedData,
  onApply,
  source,
}: BeanInfoDiffModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())

  const diffs = useMemo(() => {
    const result: FieldDiff[] = []

    for (const field of FIELD_DEFINITIONS) {
      const suggestedValue = suggestedData[field.key]
      if (!suggestedValue) continue

      const currentValue = currentData[field.formKey as keyof BeanFormData] as string
      const suggested = String(suggestedValue)

      if (currentValue !== suggested) {
        result.push({
          field,
          currentValue: currentValue || "",
          suggestedValue: suggested,
          hasConflict: !!currentValue && currentValue !== suggested,
        })
      }
    }

    return result
  }, [currentData, suggestedData])

  useMemo(() => {
    const initial = new Set<string>()
    for (const diff of diffs) {
      if (!diff.hasConflict) {
        initial.add(diff.field.formKey)
      }
    }
    setSelectedFields(initial)
  }, [diffs])

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
    const updates: Partial<BeanFormData> = {}

    for (const diff of diffs) {
      if (selectedFields.has(diff.field.formKey)) {
        if (diff.field.formKey === "roastLevel") {
          updates.roastLevel = diff.suggestedValue as RoastLevel
        } else {
          ;(updates as Record<string, string>)[diff.field.formKey] = diff.suggestedValue
        }
      }
    }

    onApply(updates)
    onOpenChange(false)
  }

  const conflictCount = diffs.filter((d) => d.hasConflict).length
  const newFieldCount = diffs.filter((d) => !d.hasConflict).length

  if (diffs.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No Changes Found</DialogTitle>
            <DialogDescription>
              {source === "image"
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {source === "image" ? "Review Extracted Info" : "Review Research Results"}
          </DialogTitle>
          <DialogDescription>
            {newFieldCount > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {newFieldCount} new field{newFieldCount !== 1 ? "s" : ""}
              </span>
            )}
            {newFieldCount > 0 && conflictCount > 0 && " · "}
            {conflictCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {conflictCount} field{conflictCount !== 1 ? "s" : ""} with existing values
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-4 px-4">
          <div className="space-y-2">
            {diffs.map((diff) => (
              <DiffRow
                key={diff.field.formKey}
                diff={diff}
                selected={selectedFields.has(diff.field.formKey)}
                onToggle={() => toggleField(diff.field.formKey)}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
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
            <Button onClick={handleApply} disabled={selectedFields.size === 0}>
              Apply {selectedFields.size} change{selectedFields.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
        "w-full text-left p-3 rounded-lg border transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30"
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{diff.field.label}</span>
            {diff.hasConflict && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                has value
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            {diff.hasConflict ? (
              <>
                <span className="text-muted-foreground line-through truncate max-w-[40%]">
                  {displayCurrent || "(empty)"}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate max-w-[40%]">{displaySuggested}</span>
              </>
            ) : (
              <span className="text-green-600 dark:text-green-400 truncate">
                {displaySuggested}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
