import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { Bookmark, Heart, MapPin, MapPinOff, Plus } from 'lucide-react'
import {
  type CollectionColumn,
  type CollectionEntry,
  CollectionList,
} from '@/components/collection/collection-list'
import { CollectionViewToggle } from '@/components/collection/collection-view-toggle'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/EmptyState'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import { WebsiteLogo } from '@/components/website-logo'
import { useCollectionView } from '@/hooks/use-collection-view'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { thumbnailUrl } from '@/lib/image-url'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getCoffeeShopPage } from '@/lib/server/coffee-shops'
import { cn } from '@/lib/utils'

const parsePlacesSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    query: searchString(search.query),
    list: searchEnum(search.list, ['all', 'favorites', 'want-to-visit'], 'all'),
  }
}

export const Route = createFileRoute('/places/')({
  validateSearch: searchValidator(parsePlacesSearch),
  search: {
    middlewares: [
      stripSearchParams({ page: 1, query: '', list: 'all' } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    query: search.query,
    list: search.list,
  }),
  loader: ({ deps }) => getCoffeeShopPage({ data: deps }),
  staleTime: 15_000,
  component: PlacesPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type CoffeeShop = Awaited<ReturnType<typeof getCoffeeShopPage>>['items'][number]

function getCoffeeShopLocation(coffeeShop: CoffeeShop): string {
  return [coffeeShop.address, coffeeShop.city, coffeeShop.country]
    .filter(Boolean)
    .join(', ')
}

function toEntry(coffeeShop: CoffeeShop): CollectionEntry {
  const hasCoordinates =
    coffeeShop.latitude !== null && coffeeShop.longitude !== null
  const location = getCoffeeShopLocation(coffeeShop)

  return {
    id: coffeeShop.id,
    title: coffeeShop.name,
    subtitle:
      location || (hasCoordinates ? 'Location pinned' : 'No location set'),
    media: coffeeShop.website
      ? {
          kind: 'custom',
          render: (sizeClassName) =>
            coffeeShop.imagePath ? (
              <span className={cn('relative block shrink-0', sizeClassName)}>
                <ImageWithFallback
                  src={thumbnailUrl(coffeeShop.imagePath)}
                  alt=""
                  loading="lazy"
                  className="size-full rounded-full object-cover"
                  fallback={<MapPin aria-hidden className="size-4" />}
                />
                <WebsiteLogo
                  entityType="coffee-shops"
                  entityId={coffeeShop.id}
                  website={coffeeShop.website}
                  updatedAt={coffeeShop.updatedAt}
                  className={cn(
                    'absolute -right-1 -bottom-1 rounded-full p-0.5 shadow-sm',
                    sizeClassName === 'size-8' ? 'size-4' : 'size-5',
                  )}
                />
              </span>
            ) : (
              <WebsiteLogo
                entityType="coffee-shops"
                entityId={coffeeShop.id}
                website={coffeeShop.website}
                updatedAt={coffeeShop.updatedAt}
                className={cn(sizeClassName, 'rounded-full p-1')}
              />
            ),
        }
      : coffeeShop.imagePath
        ? {
            kind: 'image',
            src: thumbnailUrl(coffeeShop.imagePath),
            alt: coffeeShop.name,
            fallbackIcon: MapPin,
          }
        : {
            kind: 'icon',
            icon: hasCoordinates ? MapPin : MapPinOff,
            tone: hasCoordinates ? 'primary' : 'muted',
          },
    flags: (
      <>
        {coffeeShop.isFavorite && (
          <Heart
            aria-label="Favorite"
            className="size-3.5 shrink-0 fill-current text-favorite"
          />
        )}
        {coffeeShop.wantsToVisit && (
          <Bookmark
            aria-label="Want to visit"
            className="size-3.5 shrink-0 fill-current text-primary"
          />
        )}
      </>
    ),
    to: '/shops/$coffeeShopId',
    params: { coffeeShopId: String(coffeeShop.id) },
  }
}

function PlacesPage() {
  const pageData = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/places/' })
  const { view, setView, isReady } = useCollectionView('places')
  const formatDate = useDateFormatter()
  const showRating = useTasteProfile().overallRating
  const updateSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })

  const columns: readonly CollectionColumn<CoffeeShop>[] = [
    {
      key: 'location',
      header: 'Location',
      cell: (coffeeShop) => getCoffeeShopLocation(coffeeShop) || '—',
    },
    {
      key: 'visits',
      header: 'Visits',
      align: 'right',
      cell: (coffeeShop) => coffeeShop.visitCount || '—',
    },
    {
      key: 'lastVisit',
      header: 'Last visit',
      cell: (coffeeShop) =>
        coffeeShop.latestVisitAt ? formatDate(coffeeShop.latestVisitAt) : '—',
    },
    ...(showRating
      ? [
          {
            key: 'rating',
            header: 'Rating',
            align: 'right' as const,
            cell: (coffeeShop: CoffeeShop) =>
              coffeeShop.rating ? (
                <StarRating
                  readOnly
                  variant="compact"
                  value={coffeeShop.rating}
                  sizeClassName="size-3.5"
                  ariaLabel={`${coffeeShop.name} rating`}
                />
              ) : (
                '—'
              ),
          },
        ]
      : []),
  ]

  return (
    <Page>
      <PageHeader
        title="Cafés"
        description={
          <>
            Manage {pageData.listCounts.all} saved{' '}
            {pageData.listCounts.all === 1 ? 'café' : 'cafés'}
          </>
        }
        actions={
          <Button asChild>
            <Link to="/shops/new">
              <Plus aria-hidden className="h-4 w-4" />
              Add café
            </Link>
          </Button>
        }
      />

      <CollectionToolbar
        value={search.query}
        onValueChange={(query) => updateSearch({ query, page: 1 })}
        placeholder="Search cafés…"
        ariaLabel="Search cafés"
        resultLabel={`${pageData.totalItems} ${pageData.totalItems === 1 ? 'café' : 'cafés'}`}
        actions={
          <>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Café lists</legend>
              <Button
                type="button"
                size="sm"
                variant={search.list === 'all' ? 'primary' : 'secondary'}
                aria-pressed={search.list === 'all'}
                onClick={() => updateSearch({ list: 'all', page: 1 })}
              >
                All · {pageData.listCounts.all}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={search.list === 'favorites' ? 'primary' : 'secondary'}
                aria-pressed={search.list === 'favorites'}
                onClick={() => updateSearch({ list: 'favorites', page: 1 })}
              >
                <Heart aria-hidden />
                Favorites · {pageData.listCounts.favorites}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  search.list === 'want-to-visit' ? 'primary' : 'secondary'
                }
                aria-pressed={search.list === 'want-to-visit'}
                onClick={() => updateSearch({ list: 'want-to-visit', page: 1 })}
              >
                <Bookmark aria-hidden />
                Want to visit · {pageData.listCounts.wantToVisit}
              </Button>
            </fieldset>
            <CollectionViewToggle
              value={view}
              onValueChange={setView}
              disabled={!isReady}
              label="Café list view"
            />
          </>
        }
      />

      {pageData.listCounts.all === 0 && !search.query ? (
        <EmptyState
          icon={MapPin}
          title="No cafés added yet"
          description="Add the cafés you want to remember"
          actionLabel="Add café"
          actionHref="/shops/new"
        />
      ) : pageData.totalItems === 0 &&
        !search.query &&
        search.list === 'favorites' ? (
        <EmptyState
          icon={Heart}
          title="No favorite cafés yet"
          description="Mark a saved café as a favorite to see it here"
          actionLabel="View all cafés"
          actionHref="/places"
          actionSearch={{ list: 'all', page: 1, query: '' }}
        />
      ) : pageData.totalItems === 0 &&
        !search.query &&
        search.list === 'want-to-visit' ? (
        <EmptyState
          icon={Bookmark}
          title="Your want-to-visit list is empty"
          description="Mark a saved café as somewhere you want to visit"
          actionLabel="View all cafés"
          actionHref="/places"
          actionSearch={{ list: 'all', page: 1, query: '' }}
        />
      ) : pageData.totalItems === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cafés match “{search.query}”.
        </p>
      ) : (
        <>
          <CollectionList
            view={view}
            items={pageData.items}
            getEntry={toEntry}
            columns={columns}
            titleHeader="Café"
          />
          {pageData.totalPages > 1 && (
            <PaginationControls
              page={pageData.page}
              totalPages={pageData.totalPages}
              onPageChange={(page) => updateSearch({ page })}
            />
          )}
        </>
      )}
    </Page>
  )
}
