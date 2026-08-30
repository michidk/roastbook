import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { searchValidator } from '@/lib/search-params'
import { BrewsPage } from '@/routes/brews/-components/brews-page'
import { parseBrewsSearch } from '@/routes/brews/-lib/brews-search'
import { loadBrewsPage } from '@/routes/brews/-lib/load-brews-page'

export const Route = createFileRoute('/brews/')({
  validateSearch: searchValidator(parseBrewsSearch),
  search: {
    middlewares: [
      stripSearchParams({
        page: 1,
        sort: 'date',
        direction: 'desc',
        view: 'list',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadBrewsPage(deps),
  staleTime: 15_000,
  component: BrewsRoute,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

function BrewsRoute() {
  return <BrewsPage data={Route.useLoaderData()} search={Route.useSearch()} />
}
