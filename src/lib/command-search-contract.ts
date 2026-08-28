export const COMMAND_ENTITY_SEARCH_MIN_LENGTH = 2

/** Removes an optional entity prefix while preserving the user's search text. */
export function commandEntitySearchTerm(
  query: string,
  aliases: readonly string[],
): string {
  const trimmedQuery = query.trim()
  const normalizedQuery = trimmedQuery.toLocaleLowerCase()

  for (const alias of [...aliases].sort(
    (left, right) => right.length - left.length,
  )) {
    const normalizedAlias = alias.toLocaleLowerCase()
    if (normalizedQuery === normalizedAlias) return ''
    if (normalizedQuery.startsWith(`${normalizedAlias} `)) {
      return trimmedQuery.slice(alias.length).trimStart()
    }
  }

  return trimmedQuery
}

export type CommandEntitySearchResult = {
  readonly id: number
  readonly label: string
  readonly description: string | null
  readonly keywords: readonly string[]
}

export type CommandEntitySearchResults = {
  readonly beans: readonly CommandEntitySearchResult[]
  readonly cafes: readonly CommandEntitySearchResult[]
  readonly gear: readonly CommandEntitySearchResult[]
}
