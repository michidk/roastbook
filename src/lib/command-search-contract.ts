export const COMMAND_ENTITY_SEARCH_MIN_LENGTH = 2

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
