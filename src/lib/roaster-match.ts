import { normalizeForComparison } from '@/lib/utils'

export function findRoasterByName<T extends { readonly name: string }>(
  roasters: readonly T[],
  suggestedName: string,
): T | undefined {
  const normalizedSuggestion = normalizeForComparison(suggestedName)
  if (!normalizedSuggestion) return undefined

  return roasters.find(
    (roaster) => normalizeForComparison(roaster.name) === normalizedSuggestion,
  )
}
