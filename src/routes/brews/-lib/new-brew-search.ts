import { searchInteger, searchRecord } from '@/lib/search-params'

/** Entry points such as a bean page preselect the beans to brew with. */
export function parseNewBrewSearch(input: unknown) {
  const search = searchRecord(input)
  return {
    beanId: searchInteger(search.beanId, undefined, 1),
    beanPurchaseId: searchInteger(search.beanPurchaseId, undefined, 1),
  }
}
