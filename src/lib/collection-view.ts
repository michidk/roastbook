const COLLECTION_VIEWS = ['cards', 'table'] as const

export type CollectionView = (typeof COLLECTION_VIEWS)[number]

export const COLLECTION_VIEW_OPTIONS = [
  {
    value: 'cards',
    label: 'Cards',
    description: 'A photo or icon, the name, and one supporting line',
  },
  {
    value: 'table',
    label: 'Table',
    description: 'A dense row per record with every listed column',
  },
] as const satisfies readonly {
  readonly value: CollectionView
  readonly label: string
  readonly description: string
}[]

export function isCollectionView(value: unknown): value is CollectionView {
  return COLLECTION_VIEWS.some((view) => view === value)
}

/**
 * Stable identifiers for the browsable collections. The chosen view is
 * remembered per collection, so these keys are part of the persisted browser
 * preferences and must not be renamed casually.
 */
export const COLLECTION_KEYS = [
  'places',
  'roasters',
  'recipes',
  'brewing-methods',
] as const

export type CollectionKey = (typeof COLLECTION_KEYS)[number]
