export const SHOT_SORT_VALUES = [
  'date',
  'bean',
  'dose',
  'yield',
  'time',
  'rating',
] as const

export type ShotSortKey = (typeof SHOT_SORT_VALUES)[number]
