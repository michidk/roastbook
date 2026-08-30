import { searchEnum, searchInteger, searchRecord } from '@/lib/search-params'
import { SHOT_SORT_VALUES } from '@/modules/brews/read-models'

export function parseBrewsSearch(input: unknown) {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    sort: searchEnum(search.sort, SHOT_SORT_VALUES, 'date'),
    direction: searchEnum(search.direction, ['asc', 'desc'], 'desc'),
    view: searchEnum(search.view, ['list', 'grouped'], 'list'),
    methodId: searchInteger(search.methodId, undefined, 1),
    rating: searchInteger(search.rating, undefined, 0, 5),
    beanId: searchInteger(search.beanId, undefined, 0, 100_000),
  }
}

export type BrewsSearch = ReturnType<typeof parseBrewsSearch>
