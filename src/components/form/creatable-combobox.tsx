import { useState } from "react"
import { Plus } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import { cn, normalizeForComparison } from "@/lib/utils"

const CREATE_ENTRY_KEY = "__create__"

type Entry =
  | {
      readonly kind: "item"
      readonly key: string
      readonly label: string
      readonly description?: string
    }
  | {
      readonly kind: "create"
      readonly key: typeof CREATE_ENTRY_KEY
      readonly label: string
      readonly hint?: string
      readonly query: string
    }

export interface FallbackOption {
  key: string
  label: string
  description?: string
}

export interface CreatableComboboxProps<T> {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  items: readonly T[]
  getKey: (item: T) => string | number
  getLabel: (item: T) => string
  getDescription?: (item: T) => string | null | undefined
  onCreateRequest?: (query: string) => void
  createLabel?: (query: string) => string
  noMatchHint?: (query: string) => string
  /**
   * Renders the selection when `value` isn't present in `items` yet — e.g. an
   * entity that was just created inline but whose source list hasn't refetched.
   */
  fallbackOption?: FallbackOption | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  required?: boolean
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export function CreatableCombobox<T>({
  id,
  label,
  value,
  onChange,
  items,
  getKey,
  getLabel,
  getDescription,
  onCreateRequest,
  createLabel = (query) => `Create “${query}”`,
  noMatchHint = (query) => `Nothing here matches “${query}” yet`,
  placeholder = "Select an option",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches.",
  required,
  disabled,
  className,
  autoFocus,
  fallbackOption,
}: CreatableComboboxProps<T>) {
  const [query, setQuery] = useState("")

  const itemEntries: Entry[] = items.map((item) => ({
    kind: "item",
    key: String(getKey(item)),
    label: getLabel(item),
    description: getDescription?.(item) ?? undefined,
  }))

  const trimmedQuery = query.trim()
  const normalizedQuery = normalizeForComparison(trimmedQuery)

  const matchesQuery = (entry: Entry, rawQuery: string): boolean => {
    if (entry.kind === "create") return true
    const needle = normalizeForComparison(rawQuery)
    if (!needle) return true
    return (
      normalizeForComparison(entry.label).includes(needle) ||
      (entry.description
        ? normalizeForComparison(entry.description).includes(needle)
        : false)
    )
  }

  const visibleItemCount = itemEntries.filter((entry) =>
    matchesQuery(entry, query)
  ).length

  const hasExactMatch = itemEntries.some(
    (entry) => normalizeForComparison(entry.label) === normalizedQuery
  )

  const entries: Entry[] =
    onCreateRequest && normalizedQuery.length > 0 && !hasExactMatch
      ? [
          ...itemEntries,
          {
            kind: "create",
            key: CREATE_ENTRY_KEY,
            label: createLabel(trimmedQuery),
            hint: visibleItemCount === 0 ? noMatchHint(trimmedQuery) : undefined,
            query: trimmedQuery,
          },
        ]
      : itemEntries

  const fallbackEntry: Entry | null =
    fallbackOption && fallbackOption.key === value
      ? { kind: "item", ...fallbackOption }
      : null

  const selected =
    itemEntries.find((entry) => entry.key === value) ?? fallbackEntry

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && " *"}
      </Label>
      <Combobox
        items={entries}
        value={selected}
        onValueChange={(next: Entry | null) => {
          if (next?.kind === "create") {
            onCreateRequest?.(next.query)
            return
          }
          onChange(next ? next.key : "")
        }}
        itemToStringLabel={(entry: Entry) => entry.label}
        isItemEqualToValue={(a: Entry, b: Entry) => a.key === b.key}
        filter={matchesQuery}
        inputValue={query}
        onInputValueChange={setQuery}
        onOpenChange={(open) => {
          if (!open) setQuery("")
        }}
        disabled={disabled}
      >
        <ComboboxTrigger id={id} autoFocus={autoFocus}>
          <span
            className={cn(
              "flex flex-1 truncate text-left",
              !selected && "text-muted-foreground"
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder={searchPlaceholder} />
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(entry: Entry) =>
              entry.kind === "create" ? (
                <ComboboxItem
                  key={entry.key}
                  value={entry}
                  className="border-t border-border text-primary"
                >
                  <Plus className="mt-0.5 self-start" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium">{entry.label}</span>
                    {entry.hint ? (
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {entry.hint}
                      </span>
                    ) : null}
                  </span>
                </ComboboxItem>
              ) : (
                <ComboboxItem key={entry.key} value={entry}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">{entry.label}</span>
                    {entry.description ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {entry.description}
                      </span>
                    ) : null}
                  </span>
                </ComboboxItem>
              )
            }
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
