export type SortDirection = 'asc' | 'desc'

/**
 * Direction for a clicked sortable column header: toggles on the active
 * column, starts ascending on a new one.
 */
export function nextSortDirection<Key extends string>(
  activeSort: Key,
  activeDirection: SortDirection,
  clickedKey: Key,
): SortDirection {
  return activeSort === clickedKey && activeDirection === 'asc' ? 'desc' : 'asc'
}
