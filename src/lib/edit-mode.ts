import { optionalSearchBoolean, searchRecord } from '@/lib/search-params'

/** Optional URL state shared by detail pages with read and edit modes. */
export function parseEditModeSearch(input: unknown) {
  return { edit: optionalSearchBoolean(searchRecord(input).edit) }
}
