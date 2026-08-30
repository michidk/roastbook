import { useEffect, useState } from 'react'

export type SelectableDiffDefinition<Key extends string> = {
  readonly key: Key
  readonly label: string
  readonly format?: (value: string) => string
}

export type SelectableDiff<Key extends string> =
  SelectableDiffDefinition<Key> & {
    readonly currentValue: string
    readonly suggestedValue: string
    readonly hasConflict: boolean
  }

type DiffValues = {
  readonly currentValue: unknown
  readonly suggestedValue: unknown
}

export function buildSelectableDiffs<
  Definition extends SelectableDiffDefinition<string>,
>(
  definitions: readonly Definition[],
  getValues: (definition: Definition) => DiffValues | undefined,
): SelectableDiff<Definition['key']>[] {
  const diffs: SelectableDiff<Definition['key']>[] = []

  for (const definition of definitions) {
    const values = getValues(definition)
    if (!values) continue

    const currentValue = String(values.currentValue ?? '')
    const suggestedValue = String(values.suggestedValue)
    if (currentValue === suggestedValue) continue

    diffs.push({
      key: definition.key,
      label: definition.label,
      format: definition.format,
      currentValue,
      suggestedValue,
      hasConflict: currentValue !== '',
    })
  }

  return diffs
}

export function getDefaultSelectedKeys<Key extends string>(
  diffs: readonly SelectableDiff<Key>[],
): Set<Key> {
  return new Set(
    diffs.filter((diff) => !diff.hasConflict).map((diff) => diff.key),
  )
}

export function useSelectableDiffs<Key extends string>(
  open: boolean,
  diffs: readonly SelectableDiff<Key>[],
) {
  const [selectedKeys, setSelectedKeys] = useState<Set<Key>>(new Set())

  useEffect(() => {
    if (!open) return
    setSelectedKeys(getDefaultSelectedKeys(diffs))
  }, [diffs, open])

  const toggle = (key: Key) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () =>
    setSelectedKeys(new Set(diffs.map((diff) => diff.key)))
  const clearAll = () => setSelectedKeys(new Set())

  return {
    selectedKeys,
    toggle,
    selectAll,
    clearAll,
    allSelected: diffs.length > 0 && selectedKeys.size === diffs.length,
    conflictCount: diffs.filter((diff) => diff.hasConflict).length,
  }
}
