import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  ArrowLeft,
  Award,
  Bookmark,
  CalendarDays,
  Coffee,
  ExternalLink,
  Heart,
  MapPin,
  MapPinned,
  MapPinOff,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { CoffeeShopFields } from '@/components/coffee-shops/coffee-shop-fields'
import {
  applyCoffeeShopSearchResult,
  coffeeShopUpdatePayload,
  createCoffeeShopFormValues,
} from '@/components/coffee-shops/coffee-shop-form-values'
import { CoffeeShopMap } from '@/components/coffee-shops/coffee-shop-map'
import type { CoffeeShopSearchResult } from '@/components/coffee-shops/coffee-shop-osm-search'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { MetricCard } from '@/components/metric-card'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import {
  CafeVisitList,
  sortCafeVisitsByDate,
} from '@/components/visits/cafe-visit-list'
import { WebsiteLogo } from '@/components/website-logo'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { editModeSearchField } from '@/lib/edit-mode'
import { toNullableRating, toRatingInput } from '@/lib/rating'
import {
  deleteCoffeeShop,
  getCoffeeShop,
  updateCoffeeShop,
} from '@/lib/server/coffee-shops'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/shops/$coffeeShopId')({
  validateSearch: z.object({ edit: editModeSearchField }),
  loader: ({ params }) => getCoffeeShop({ data: Number(params.coffeeShopId) }),
  component: CoffeeShopDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/shops" backLabel="Back to cafés" />
  ),
})

type CoffeeShop = NonNullable<Awaited<ReturnType<typeof getCoffeeShop>>>

function createEditValues(coffeeShop?: CoffeeShop | null) {
  return {
    ...createCoffeeShopFormValues(coffeeShop),
    rating: toRatingInput(coffeeShop?.rating ?? null),
  }
}

type EditValues = ReturnType<typeof createEditValues>

function CoffeeShopDetailPage() {
  const coffeeShop = Route.useLoaderData()
  const { edit: isEditing = false } = Route.useSearch()
  const navigate = useNavigate({ from: '/shops/$coffeeShopId' })
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [updatingList, setUpdatingList] = useState<
    'favorite' | 'want-to-visit' | null
  >(null)
  const [formData, setFormData] = useState(() => createEditValues(coffeeShop))

  useEffect(() => setFormData(createEditValues(coffeeShop)), [coffeeShop])

  if (!coffeeShop) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Café not found</h2>
        <Button asChild className="mt-4">
          <Link to="/shops">Back to cafés</Link>
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error('Café name is required')
    setIsSaving(true)
    try {
      await updateCoffeeShop({
        data: {
          ...coffeeShopUpdatePayload(coffeeShop.id, formData),
          rating: toNullableRating(formData.rating),
        },
      })
      await navigate({
        search: (current) => ({ ...current, edit: undefined }),
        replace: true,
      })
      await router.invalidate({ filter: (match) => match.routeId === Route.id })
      toast.success('Café updated')
    } catch {
      toast.error('Could not save this café')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Page width={isEditing ? 'form' : 'wide'}>
      <CoffeeShopDetailHeader
        coffeeShop={coffeeShop}
        formData={formData}
        isEditing={isEditing}
        isSaving={isSaving}
        isUpdatingFavorite={updatingList === 'favorite'}
        isUpdatingWantToVisit={updatingList === 'want-to-visit'}
        onToggleFavorite={async () => {
          setUpdatingList('favorite')
          try {
            await updateCoffeeShop({
              data: { id: coffeeShop.id, isFavorite: !coffeeShop.isFavorite },
            })
            await router.invalidate()
          } catch {
            toast.error('Could not update favorites')
          } finally {
            setUpdatingList(null)
          }
        }}
        onToggleWantToVisit={async () => {
          setUpdatingList('want-to-visit')
          try {
            await updateCoffeeShop({
              data: {
                id: coffeeShop.id,
                wantsToVisit: !coffeeShop.wantsToVisit,
              },
            })
            await router.invalidate()
          } catch {
            toast.error('Could not update your want-to-visit list')
          } finally {
            setUpdatingList(null)
          }
        }}
        onCancel={() => {
          setFormData(createEditValues(coffeeShop))
          void navigate({
            search: (current) => ({ ...current, edit: undefined }),
            replace: true,
          })
        }}
        onSave={handleSave}
        onDelete={async () => {
          await deleteCoffeeShop({ data: coffeeShop.id })
          await navigate({ to: '/shops' })
        }}
      />
      {isEditing ? (
        <>
          <CoffeeShopEditContent
            formData={formData}
            setFormData={setFormData}
          />
          <CoffeeShopVisits coffeeShop={coffeeShop} />
        </>
      ) : (
        <CoffeeShopReadOnlyContent coffeeShop={coffeeShop} />
      )}
    </Page>
  )
}

function CoffeeShopDetailHeader({
  coffeeShop,
  formData,
  isEditing,
  isSaving,
  isUpdatingFavorite,
  isUpdatingWantToVisit,
  onToggleFavorite,
  onToggleWantToVisit,
  onCancel,
  onSave,
  onDelete,
}: {
  coffeeShop: CoffeeShop
  formData: EditValues
  isEditing: boolean
  isSaving: boolean
  isUpdatingFavorite: boolean
  isUpdatingWantToVisit: boolean
  onToggleFavorite: () => void
  onToggleWantToVisit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <PageHeader
      size="compact"
      title={
        <span className="inline-flex items-center gap-3">
          <WebsiteLogo
            entityType="coffee-shops"
            entityId={coffeeShop.id}
            website={coffeeShop.website}
            updatedAt={coffeeShop.updatedAt}
            className="size-12"
          />
          <span>{coffeeShop.name}</span>
        </span>
      }
      description={
        coffeeShop.city || coffeeShop.country
          ? [coffeeShop.city, coffeeShop.country].filter(Boolean).join(', ')
          : undefined
      }
      leading={
        <Button variant="outline" size="icon-sm" asChild>
          <Link to="/shops" aria-label="Back to cafés">
            <ArrowLeft />
          </Link>
        </Button>
      }
      actions={
        <>
          {coffeeShop.rating ? (
            <StarRating
              value={coffeeShop.rating}
              readOnly
              sizeClassName="size-4"
            />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            type="button"
            aria-label={
              coffeeShop.isFavorite
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
            className={isEditing ? 'min-w-11' : undefined}
            aria-pressed={coffeeShop.isFavorite}
            onClick={onToggleFavorite}
            disabled={isUpdatingFavorite || isUpdatingWantToVisit}
          >
            <Heart
              className={
                coffeeShop.isFavorite ? 'fill-current text-favorite' : undefined
              }
            />
            <span className={isEditing ? 'hidden sm:inline' : undefined}>
              {coffeeShop.isFavorite ? 'Favorited' : 'Favorite'}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            aria-label={
              coffeeShop.wantsToVisit
                ? 'Remove from want-to-visit list'
                : 'Add to want-to-visit list'
            }
            aria-pressed={coffeeShop.wantsToVisit}
            className={isEditing ? 'min-w-11' : undefined}
            onClick={onToggleWantToVisit}
            disabled={isUpdatingFavorite || isUpdatingWantToVisit}
          >
            <Bookmark
              className={
                coffeeShop.wantsToVisit
                  ? 'fill-current text-primary'
                  : undefined
              }
            />
            <span className={isEditing ? 'hidden sm:inline' : undefined}>
              Want to visit
            </span>
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving || !formData.name.trim()}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/shops/$coffeeShopId"
                params={{ coffeeShopId: String(coffeeShop.id) }}
                search={{ edit: true }}
              >
                <Pencil />
                Edit
              </Link>
            </Button>
          )}
          <DeleteConfirmation
            title="Delete this café?"
            description="This will not delete your café visits at this location. This action cannot be undone."
            onConfirm={onDelete}
            trigger={
              <Button
                variant="outline"
                size="icon-sm"
                className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
                aria-label="Delete this café?"
              >
                <Trash2 aria-hidden />
              </Button>
            }
          />
        </>
      }
    />
  )
}

function CoffeeShopEditContent({
  formData,
  setFormData,
}: {
  formData: EditValues
  setFormData: Dispatch<SetStateAction<EditValues>>
}) {
  const set = <Key extends keyof EditValues>(
    key: Key,
    value: EditValues[Key],
  ) => setFormData((current) => ({ ...current, [key]: value }))
  const applyResult = (result: CoffeeShopSearchResult) =>
    setFormData((current) => applyCoffeeShopSearchResult(current, result))

  return (
    <CoffeeShopFields
      values={formData}
      onChange={set}
      onApplySearchResult={applyResult}
      initialQuery={formData.name}
      idPrefix="coffee-shop-edit"
      rating={{
        value: formData.rating,
        onChange: (rating) =>
          set('rating', formData.rating === rating ? 0 : rating),
      }}
    />
  )
}

function CoffeeShopReadOnlyContent({ coffeeShop }: { coffeeShop: CoffeeShop }) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const hasCoordinates =
    coffeeShop.latitude !== null && coffeeShop.longitude !== null
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${coffeeShop.latitude}&mlon=${coffeeShop.longitude}#map=18/${coffeeShop.latitude}/${coffeeShop.longitude}`
    : null
  const sortedVisits = sortCafeVisitsByDate(coffeeShop.cafeVisits)
  const lastVisit = sortedVisits[0]
  const location = [coffeeShop.city, coffeeShop.country]
    .filter(Boolean)
    .join(', ')

  const ratedVisits = sortedVisits.filter((visit) => visit.rating !== null)
  const averageRating =
    ratedVisits.length > 0
      ? ratedVisits.reduce((sum, visit) => sum + (visit.rating ?? 0), 0) /
        ratedVisits.length
      : null
  const drinkCounts = new Map<string, number>()
  for (const visit of sortedVisits) {
    const drinkName = visit.drinkName?.trim()
    if (drinkName) {
      drinkCounts.set(drinkName, (drinkCounts.get(drinkName) ?? 0) + 1)
    }
  }
  let favoriteDrink: { name: string; count: number } | null = null
  for (const [name, count] of drinkCounts) {
    if (!favoriteDrink || count > favoriteDrink.count) {
      favoriteDrink = { name, count }
    }
  }

  return (
    <>
      {lastVisit && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Coffees"
            value={sortedVisits.length}
            icon={Coffee}
          />
          {favoriteDrink && (
            <MetricCard
              label="Favorite drink"
              value={favoriteDrink.name}
              detail={
                favoriteDrink.count === 1
                  ? 'Ordered once'
                  : `Ordered ${favoriteDrink.count} times`
              }
              icon={Award}
            />
          )}
          {averageRating !== null && (
            <MetricCard
              label="Average rating"
              value={formatNumber(averageRating.toFixed(1))}
              detail={
                ratedVisits.length === 1
                  ? 'From 1 rated visit'
                  : `From ${ratedVisits.length} rated visits`
              }
              icon={Star}
            />
          )}
          <MetricCard
            label="Last visit"
            value={formatDate(lastVisit.visitedAt)}
            detail={lastVisit.drinkName || 'Coffee'}
            icon={CalendarDays}
          />
        </div>
      )}
      <div
        className={cn(
          'grid gap-6',
          hasCoordinates &&
            'lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start',
        )}
      >
        {hasCoordinates && (
          <div className="lg:sticky lg:top-24 lg:order-2">
            <CoffeeShopMap
              coffeeShops={[coffeeShop]}
              visits={coffeeShop.cafeVisits}
              focusFirstCoffeeShop
            />
          </div>
        )}
        <div className="min-w-0 space-y-6 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    hasCoordinates
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {hasCoordinates ? (
                    <MapPin aria-hidden className="size-4" />
                  ) : (
                    <MapPinOff aria-hidden className="size-4" />
                  )}
                </span>
                <div className="min-w-0 space-y-0.5">
                  {coffeeShop.address ? (
                    <p className="font-medium">{coffeeShop.address}</p>
                  ) : null}
                  <p
                    className={
                      coffeeShop.address
                        ? 'text-sm text-muted-foreground'
                        : 'font-medium'
                    }
                  >
                    {location || 'No location info yet'}
                  </p>
                  {!hasCoordinates && (
                    <p className="text-sm text-muted-foreground">
                      Add coordinates to see this café on the map.
                    </p>
                  )}
                </div>
              </div>
              {(openStreetMapUrl || coffeeShop.website) && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4">
                  {openStreetMapUrl && (
                    <a
                      href={openStreetMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
                    >
                      <MapPinned aria-hidden className="size-4" />
                      Open in OpenStreetMap
                    </a>
                  )}
                  {coffeeShop.website && (
                    <a
                      href={coffeeShop.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
                    >
                      <ExternalLink aria-hidden className="size-4" />
                      Website
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {coffeeShop.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{coffeeShop.notes}</p>
              </CardContent>
            </Card>
          )}
          <CoffeeShopVisits coffeeShop={coffeeShop} />
        </div>
      </div>
    </>
  )
}

function CoffeeShopVisits({ coffeeShop }: { coffeeShop: CoffeeShop }) {
  const visitCount = coffeeShop.cafeVisits.length

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>
          Visits
          {visitCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {visitCount}
            </Badge>
          )}
        </CardTitle>
        <Button size="sm" asChild>
          <Link
            to="/visits/new"
            search={{ coffeeShopId: String(coffeeShop.id) }}
          >
            <Plus />
            Log a visit
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {visitCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No visits logged at this café yet.
          </p>
        ) : (
          <CafeVisitList visits={coffeeShop.cafeVisits} />
        )}
      </CardContent>
    </Card>
  )
}
