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
import { CollectionViewToggle } from '@/components/collection/collection-view-toggle'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/EmptyState'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCollectionView } from '@/hooks/use-collection-view'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { thumbnailUrl } from '@/lib/image-url'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getRecipePage } from '@/lib/server/recipes'

const parseRecipeSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    query: searchString(search.query),
    sort: searchEnum(search.sort, ['name', 'updated'], 'updated'),
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
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Recipe = Awaited<ReturnType<typeof getRecipePage>>['items'][number]

type SortKey = 'name' | 'updated'

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
  const updateSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })
  const handleSort = (key: string) =>
    updateSearch({
      sort: key as SortKey,
      direction:
        search.sort === key
          ? search.direction === 'asc'
            ? 'desc'
            : 'asc'
          : key === 'name'
            ? 'asc'
            : 'desc',
      page: 1,
    })

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
        description="Reusable brew values, organized by brewing method."
        actions={
          <Button asChild>
            <Link to="/recipes/new">
              <Plus aria-hidden="true" /> New recipe
            </Link>
          </Button>
        }
      />

      {pageData.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={BookOpen}
          title="No recipes yet"
          description="Open any saved brew and choose “Save as recipe”."
          actionLabel="Browse brews"
          actionHref="/brews"
        />
      ) : (
        <div className="space-y-4">
          <CollectionToolbar
            value={search.query}
            onValueChange={(query) => updateSearch({ query, page: 1 })}
            placeholder="Search recipes…"
            ariaLabel="Search recipes"
            resultLabel={`${pageData.totalItems} ${pageData.totalItems === 1 ? 'recipe' : 'recipes'}`}
            actions={
              <CollectionViewToggle
                value={view}
                onValueChange={setView}
                disabled={!isReady}
                label="Recipe list view"
              />
            }
          />

          {pageData.totalItems === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No recipes match “{search.query}”.
            </p>
          ) : (
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
          )}

          {pageData.totalPages > 1 && (
            <PaginationControls
              page={pageData.page}
              totalPages={pageData.totalPages}
              onPageChange={(page) => updateSearch({ page })}
            />
          )}
        </div>
      )}
    </Page>
  )
}
