import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  MapPinned,
  Pencil,
  Plus,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  applyCoffeeShopSearchResult,
  createCoffeeShopFormValues,
} from '@/components/coffee-shops/coffee-shop-form-values'
import { CoffeeShopMap } from '@/components/coffee-shops/coffee-shop-map'
import {
  CoffeeShopOsmSearch,
  type CoffeeShopSearchResult,
} from '@/components/coffee-shops/coffee-shop-osm-search'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { InputField, TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { toNullableRating, toRatingInput } from '@/lib/rating'
import {
  deleteCoffeeShop,
  getCoffeeShop,
  updateCoffeeShop,
} from '@/lib/server/coffee-shops'

export const Route = createFileRoute('/shops/$coffeeShopId')({
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
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(() => createEditValues(coffeeShop))

  useEffect(() => setFormData(createEditValues(coffeeShop)), [coffeeShop])

  if (!coffeeShop) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Café not found</h2>
        <Button asChild className="mt-4">
          <Link to="/visits">Back to visits</Link>
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
          id: coffeeShop.id,
          name: formData.name,
          address: formData.address || undefined,
          city: formData.city || undefined,
          country: formData.country || undefined,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          website: formData.website || undefined,
          notes: formData.notes || undefined,
          rating: toNullableRating(formData.rating),
        },
      })
      await router.invalidate({ filter: (match) => match.routeId === Route.id })
      setIsEditing(false)
      toast.success('Café updated')
    } catch {
      toast.error('Could not save this café')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Page width="form">
      <CoffeeShopDetailHeader
        coffeeShop={coffeeShop}
        formData={formData}
        isEditing={isEditing}
        isSaving={isSaving}
        onToggleFavorite={async () => {
          await updateCoffeeShop({
            data: { id: coffeeShop.id, isFavorite: !coffeeShop.isFavorite },
          })
          await router.invalidate({
            filter: (match) => match.routeId === Route.id,
          })
        }}
        onStartEdit={() => setIsEditing(true)}
        onCancel={() => {
          setFormData(createEditValues(coffeeShop))
          setIsEditing(false)
        }}
        onSave={handleSave}
        onDelete={async () => {
          await deleteCoffeeShop({ data: coffeeShop.id })
          await navigate({ to: '/shops' })
        }}
      />
      {isEditing ? (
        <CoffeeShopEditContent formData={formData} setFormData={setFormData} />
      ) : (
        <CoffeeShopReadOnlyContent coffeeShop={coffeeShop} />
      )}
      <CoffeeShopActivity coffeeShop={coffeeShop} />
    </Page>
  )
}

function CoffeeShopDetailHeader({
  coffeeShop,
  formData,
  isEditing,
  isSaving,
  onToggleFavorite,
  onStartEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  coffeeShop: CoffeeShop
  formData: EditValues
  isEditing: boolean
  isSaving: boolean
  onToggleFavorite: () => void
  onStartEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <PageHeader
      size="compact"
      title={coffeeShop.name}
      description={
        coffeeShop.city || coffeeShop.country
          ? [coffeeShop.city, coffeeShop.country].filter(Boolean).join(', ')
          : undefined
      }
      leading={
        <Button variant="outline" size="icon" asChild>
          <Link to="/visits" aria-label="Back to visits">
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
            onClick={onToggleFavorite}
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
          {isEditing ? (
            <>
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={isSaving || !formData.name.trim()}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onStartEdit}>
              <Pencil />
              Edit
            </Button>
          )}
          <DeleteConfirmation
            title="Delete this café?"
            description="This will not delete your café visits at this location. This action cannot be undone."
            onConfirm={onDelete}
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
    <>
      <FormSection title="Basic info">
        <CoffeeShopOsmSearch
          onApply={applyResult}
          initialQuery={formData.name}
        />
        <InputField
          id="name"
          label="Name"
          placeholder="e.g., Blue Bottle Coffee"
          value={formData.name}
          onChange={(value) => set('name', value)}
          required
        />
        <div className="space-y-2">
          <span className="text-sm font-medium">Rating</span>
          <StarRating
            value={formData.rating}
            onChange={(rating) =>
              set('rating', formData.rating === rating ? 0 : rating)
            }
            ariaLabel="Café rating"
          />
        </div>
        <InputField
          id="address"
          label="Address"
          placeholder="Street address"
          value={formData.address}
          onChange={(value) => set('address', value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="city"
            label="City"
            placeholder="e.g., San Francisco"
            value={formData.city}
            onChange={(value) => set('city', value)}
          />
          <InputField
            id="country"
            label="Country"
            placeholder="e.g., USA"
            value={formData.country}
            onChange={(value) => set('country', value)}
          />
        </div>
      </FormSection>
      <FormSection
        title="Coordinates"
        description="Add coordinates to pin this café on the map. You can leave these blank and add them later."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="latitude"
            label="Latitude"
            type="number"
            min={-90}
            max={90}
            step="0.001"
            showStepper={false}
            placeholder="e.g., 37.7764"
            value={formData.latitude}
            onChange={(value) => set('latitude', value)}
          />
          <InputField
            id="longitude"
            label="Longitude"
            type="number"
            min={-180}
            max={180}
            step="0.001"
            showStepper={false}
            placeholder="e.g., -122.4231"
            value={formData.longitude}
            onChange={(value) => set('longitude', value)}
          />
        </div>
      </FormSection>
      <FormSection title="Online">
        <InputField
          id="website"
          label="Website"
          type="url"
          placeholder="https://…"
          value={formData.website}
          onChange={(value) => set('website', value)}
        />
      </FormSection>
      <FormSection title="Notes">
        <TextareaField
          id="notes"
          label=""
          placeholder="Any notes about this café"
          value={formData.notes}
          onChange={(value) => set('notes', value)}
          rows={3}
        />
      </FormSection>
    </>
  )
}

function CoffeeShopReadOnlyContent({ coffeeShop }: { coffeeShop: CoffeeShop }) {
  const hasCoordinates =
    coffeeShop.latitude !== null && coffeeShop.longitude !== null

  return (
    <>
      <section aria-labelledby="location-heading" className="space-y-3">
        <h2
          id="location-heading"
          className="font-display text-lg font-bold tracking-tight"
        >
          Location
        </h2>
        {hasCoordinates && (
          <CoffeeShopMap
            coffeeShops={[coffeeShop]}
            visits={coffeeShop.cafeVisits}
          />
        )}
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {coffeeShop.address && (
                <p className="font-medium">{coffeeShop.address}</p>
              )}
              <p className="text-muted-foreground">
                {[coffeeShop.city, coffeeShop.country]
                  .filter(Boolean)
                  .join(', ') || 'No location info'}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasCoordinates
                  ? `${coffeeShop.latitude}, ${coffeeShop.longitude}`
                  : 'Add coordinates to see this café on the map.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
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
    </>
  )
}

function CoffeeShopActivity({ coffeeShop }: { coffeeShop: CoffeeShop }) {
  const formatDate = useDateFormatter()
  const hasCoordinates =
    coffeeShop.latitude !== null && coffeeShop.longitude !== null
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${coffeeShop.latitude}&mlon=${coffeeShop.longitude}#map=18/${coffeeShop.latitude}/${coffeeShop.longitude}`
    : null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {openStreetMapUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={openStreetMapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPinned />
                Open in OpenStreetMap
              </a>
            </Button>
          )}
          {coffeeShop.website && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={coffeeShop.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                Open website
              </a>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link
              to="/visits/new"
              search={{ coffeeShopId: String(coffeeShop.id) }}
            >
              <Plus />
              Log a visit
            </Link>
          </Button>
        </CardContent>
      </Card>
      {coffeeShop.cafeVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coffeeShop.cafeVisits.slice(0, 5).map((visit) => (
                <Link
                  key={visit.id}
                  to="/visits/$visitId"
                  params={{ visitId: String(visit.id) }}
                  className="flex min-h-11 items-center rounded p-2 hover:bg-muted"
                >
                  <div className="flex w-full justify-between">
                    <span className="font-medium">
                      {visit.drinkName || 'Coffee'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(visit.visitedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
