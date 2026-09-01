import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { BookOpen, Plus } from 'lucide-react'
import {
  type CollectionColumn,
  type CollectionEntry,
  CollectionList,
} from '@/components/collection/collection-list'
import { CollectionResults } from '@/components/collection/collection-results'
import { CollectionViewToggle } from '@/components/collection/collection-view-toggle'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/empty-state'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCollectionView } from '@/hooks/use-collection-view'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { nextSortDirection } from '@/lib/collection-sort'
import { thumbnailUrl } from '@/lib/image-url'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getRecipePage } from '@/lib/server/recipes'

const SORT_KEYS = ['name', 'updated'] as const

const parseRecipeSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    query: searchString(search.query),
    sort: searchEnum(search.sort, SORT_KEYS, 'updated'),
    direction: searchEnum(search.direction, ['asc', 'desc'], 'desc'),
  }
}

export const Route = createFileRoute('/recipes/')({
  validateSearch: searchValidator(parseRecipeSearch),
  search: {
    middlewares: [
      stripSearchParams({
        page: 1,
        query: '',
        sort: 'updated',
        direction: 'desc',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    query: search.query,
    sort: search.sort,
    direction: search.direction,
  }),
  loader: ({ deps }) => getRecipePage({ data: deps }),
  staleTime: 15_000,
  component: RecipesPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

type Recipe = Awaited<ReturnType<typeof getRecipePage>>['items'][number]

function getBeanThumbnail(recipe: Recipe): string | null {
  const images = recipe.bean?.images ?? []
  const thumbnail = images.find((image) => image.isThumbnail) ?? images[0]
  return thumbnail ? thumbnailUrl(thumbnail.storagePath) : null
}

function toEntry(recipe: Recipe): CollectionEntry {
  return {
    id: recipe.id,
    title: recipe.name,
    subtitle: recipe.bean?.name ?? 'Any beans',
    media: {
      kind: 'image',
      src: getBeanThumbnail(recipe),
      alt: recipe.bean?.name ?? recipe.name,
      fallbackIcon: BookOpen,
    },
    trailing: (
      <Badge variant="outline" className="text-xs">
        {recipe.brewingMethod.name}
      </Badge>
    ),
    to: '/recipes/$recipeId',
    params: { recipeId: String(recipe.id) },
  }
}

function RecipesPage() {
  const pageData = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/recipes/' })
  const { view, setView, isReady } = useCollectionView('recipes')
  const formatNumber = useNumberFormatter()
  const formatDate = useDateFormatter()
  const updateSearch = (
    values: Partial<typeof search>,
    options?: { replace?: boolean },
  ) =>
    navigate({
      search: (current) => ({ ...current, ...values }),
      replace: options?.replace,
    })
  const handleSort = (key: string) => {
    const sort = searchEnum(key, SORT_KEYS, 'updated')
    updateSearch({
      sort,
      // New non-name columns start with the most recent recipes first
      // instead of the shared ascending default.
      direction:
        search.sort !== sort && sort !== 'name'
          ? 'desc'
          : nextSortDirection(search.sort, search.direction, sort),
      page: 1,
    })
  }

  /** Only render a parameter the recipe's brewing method actually records. */
  const parameter = (
    recipe: Recipe,
    key: string,
    value: string | null,
    suffix: string,
  ) =>
    recipe.brewingMethod.enabledParameters.includes(key) && value
      ? `${formatNumber(value)} ${suffix}`
      : '—'

  const columns: readonly CollectionColumn<Recipe>[] = [
    {
      key: 'method',
      header: 'Method',
      cell: (recipe) => (
        <Badge variant="outline" className="text-xs">
          {recipe.brewingMethod.name}
        </Badge>
      ),
    },
    {
      key: 'bean',
      header: 'Bean',
      cell: (recipe) => recipe.bean?.name ?? 'Any beans',
    },
    {
      key: 'dose',
      header: 'Dose',
      align: 'right',
      cell: (recipe) => parameter(recipe, 'doseGrams', recipe.doseGrams, 'g'),
    },
    {
      key: 'yield',
      header: 'Yield',
      align: 'right',
      cell: (recipe) => parameter(recipe, 'yieldGrams', recipe.yieldGrams, 'g'),
    },
    {
      key: 'time',
      header: 'Time',
      align: 'right',
      cell: (recipe) =>
        recipe.brewingMethod.enabledParameters.includes('shotTimeSeconds') &&
        recipe.shotTimeSeconds !== null
          ? `${formatNumber(recipe.shotTimeSeconds)} s`
          : '—',
    },
    {
      key: 'updated',
      header: 'Updated',
      sortKey: 'updated',
      cell: (recipe) => formatDate(recipe.updatedAt),
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Recipes"
        description="Save brew settings you want to use again."
        help="Recipes are reusable starting points for a brewing method. Save measurements, temperatures, timings, beans, and equipment, then load them when creating a new brew."
      />

      <CollectionToolbar
        value={search.query}
        onValueChange={(query) =>
          updateSearch({ query, page: 1 }, { replace: true })
        }
        placeholder="Search recipes…"
        ariaLabel="Search recipes"
        resultLabel={`${pageData.totalItems} ${pageData.totalItems === 1 ? 'recipe' : 'recipes'}`}
        actions={
          <>
            <CollectionViewToggle
              value={view}
              onValueChange={setView}
              disabled={!isReady}
              label="Recipe list view"
            />
            <Button asChild>
              <Link to="/recipes/new">
                <Plus aria-hidden className="h-4 w-4" />
                New recipe
              </Link>
            </Button>
          </>
        }
      />

      {pageData.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={BookOpen}
          title="No recipes yet"
          description="Create a recipe or save one from a brew you enjoyed."
          actionLabel="Browse brews"
          actionHref="/brews"
        />
      ) : (
        <CollectionResults
          totalItems={pageData.totalItems}
          emptyMessage={<>No recipes match “{search.query}”.</>}
          page={pageData.page}
          totalPages={pageData.totalPages}
          onPageChange={(page) => updateSearch({ page })}
        >
          <CollectionList
            view={view}
            items={pageData.items}
            getEntry={toEntry}
            columns={columns}
            titleHeader="Recipe"
            titleSortKey="name"
            sort={{
              key: search.sort,
              direction: search.direction,
              onSort: handleSort,
            }}
          />
        </CollectionResults>
      )}
    </Page>
  )
}
