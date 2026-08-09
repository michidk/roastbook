import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  MapPinned,
  Pencil,
  Search,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { StarRating } from "@/components/ui/star-rating"
import { Textarea } from "@/components/ui/textarea"
import { CoffeeShopMap } from "@/components/coffee-shops/coffee-shop-map"
import { searchCoffeeShopCandidates } from "@/lib/server/geocoding"
import { getCoffeeShop, deleteCoffeeShop, updateCoffeeShop } from "@/lib/server/coffee-shops"
import { toNullableRating, toRatingInput } from "@/lib/rating"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"
import {
  applyCoffeeShopSearchResult,
  createCoffeeShopFormValues,
} from "@/components/coffee-shops/coffee-shop-form-values"

type SearchResult = Awaited<ReturnType<typeof searchCoffeeShopCandidates>>[number]

export const Route = createFileRoute("/coffee-shops/$coffeeShopId")({
  loader: ({ params }) => getCoffeeShop({ data: Number(params.coffeeShopId) }),
  component: CoffeeShopDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/coffee-shops" backLabel="Back to coffee shops" />
  ),
})

function CoffeeShopDetailPage() {
  const coffeeShop = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedSearchResultId, setSelectedSearchResultId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState(() => ({
    ...createCoffeeShopFormValues(coffeeShop),
    rating: toRatingInput(coffeeShop?.rating ?? null),
  }))

  useEffect(() => {
    setFormData({
      ...createCoffeeShopFormValues(coffeeShop),
      rating: toRatingInput(coffeeShop?.rating ?? null),
    })
  }, [coffeeShop])

  if (!coffeeShop) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Coffee shop not found</h2>
        <Button asChild className="mt-4">
          <Link to="/visits">Back to visits</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    await deleteCoffeeShop({ data: coffeeShop.id })
    navigate({ to: "/coffee-shops" })
  }

  const handleToggleFavorite = async () => {
    await updateCoffeeShop({ data: { id: coffeeShop.id, isFavorite: !coffeeShop.isFavorite } })
    router.invalidate()
  }

  const handleGeocodeSearch = async () => {
    const normalizedQuery = searchQuery.trim().replace(/\s+/g, " ")

    if (normalizedQuery.length < 3) {
      toast.error("Add a coffee shop name or address before searching")
      return
    }

    setIsSearching(true)

    try {
      const results = await searchCoffeeShopCandidates({ data: { query: normalizedQuery } })
      setSearchResults(results)
      setSelectedSearchResultId(null)

      if (results.length === 0) {
        toast.info("No matching coffee shops found")
      }
    } catch {
      toast.error("Could not search OpenStreetMap right now")
    } finally {
      setIsSearching(false)
    }
  }

  const applySearchResult = (result: SearchResult) => {
    setSelectedSearchResultId(result.id)
    setFormData((current) => applyCoffeeShopSearchResult(current, result))
    setSearchQuery(result.displayName)
    toast.success("Coffee shop details applied")
  }

  const resetEditState = () => {
    setFormData({
      ...createCoffeeShopFormValues(coffeeShop),
      rating: toRatingInput(coffeeShop.rating),
    })
    setSearchQuery("")
    setSearchResults([])
    setSelectedSearchResultId(null)
  }

  const handleCancel = () => {
    resetEditState()
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Coffee shop name is required")
      return
    }

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
      await router.invalidate()
      setIsEditing(false)
      setSearchQuery("")
      setSearchResults([])
      setSelectedSearchResultId(null)
      toast.success("Coffee shop updated")
    } catch {
      toast.error("Could not save this coffee shop")
    } finally {
      setIsSaving(false)
    }
  }

  const hasCoordinates = coffeeShop.latitude !== null && coffeeShop.longitude !== null
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${coffeeShop.latitude}&mlon=${coffeeShop.longitude}#map=18/${coffeeShop.latitude}/${coffeeShop.longitude}`
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/visits" aria-label="Back to visits">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-2xl font-bold">{coffeeShop.name}</h1>
              {coffeeShop.rating ? (
                <StarRating value={coffeeShop.rating} readOnly sizeClassName="size-4" />
              ) : null}
            </div>
            {(coffeeShop.city || coffeeShop.country) && (
              <p className="text-muted-foreground">
                {[coffeeShop.city, coffeeShop.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            aria-label={coffeeShop.isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={isEditing ? "min-w-11" : undefined}
            onClick={handleToggleFavorite}
          >
            {coffeeShop.isFavorite ? (
              <>
                <Heart className="h-4 w-4 fill-current text-destructive" />
                <span className={isEditing ? "hidden sm:inline" : undefined}>Favorited</span>
              </>
            ) : (
              <>
                <Heart className="h-4 w-4" />
                <span className={isEditing ? "hidden sm:inline" : undefined}>Favorite</span>
              </>
            )}
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <DeleteConfirmation
            title="Delete this coffee shop?"
            description="This will not delete your cafe visits at this location. This action cannot be undone."
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {isEditing ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search OpenStreetMap</Label>
                <InputGroup className="items-stretch">
                  <InputGroupInput
                    id="search"
                    placeholder="e.g., Blue Bottle Coffee, San Francisco"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 text-base sm:h-full"
                  />
                  <InputGroupAddon align="inline-end" className="pr-0.5 sm:pr-1.5">
                    <InputGroupButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label={isSearching ? "Searching OpenStreetMap" : "Search OpenStreetMap"}
                      onClick={handleGeocodeSearch}
                      disabled={isSearching || searchQuery.trim().length < 3}
                      className="size-11 p-0 sm:h-8 sm:w-auto sm:px-3"
                    >
                      <Search className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {isSearching ? "Searching..." : "Search coffee shop"}
                      </span>
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                  <p>Apply a match to prefill contact and location details.</p>
                  <div className="shrink-0 rounded-full border bg-muted px-2 py-0.5 font-medium">
                    OSM
                  </div>
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Suggested matches
                      </div>
                      <Badge variant="secondary">{searchResults.length} found</Badge>
                    </div>
                    <div className="space-y-2">
                      {searchResults.map((result) => {
                        const isSelected = selectedSearchResultId === result.id

                        return (
                          <div
                            key={result.id}
                            className="flex items-stretch rounded-lg border bg-card transition-colors hover:bg-muted/50"
                          >
                            <button
                              type="button"
                              onClick={() => applySearchResult(result)}
                              className="min-w-0 flex-1 p-3 text-left"
                            >
                              <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{result.name}</p>
                                  {isSelected && <Badge>Selected</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {result.displayName}
                                </p>
                              </div>
                                <Badge variant="outline">Use</Badge>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {result.latitude}, {result.longitude}
                              </p>
                            </button>
                            {result.openStreetMapUrl && (
                              <a
                                href={result.openStreetMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="m-2 inline-flex min-h-11 shrink-0 items-center gap-1 self-center rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                OSM
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Search results and map data © OpenStreetMap contributors via Nominatim.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Blue Bottle Coffee"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <StarRating
                  value={formData.rating}
                  onChange={(rating) =>
                    setFormData({
                      ...formData,
                      rating: formData.rating === rating ? 0 : rating,
                    })
                  }
                  ariaLabel="Coffee shop rating"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., San Francisco"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g., USA"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coordinates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add coordinates to pin this coffee shop on the map. You can leave these blank and
                add them later.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    inputMode="decimal"
                    placeholder="e.g., 37.7764"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    inputMode="decimal"
                    placeholder="e.g., -122.4231"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://..."
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id="notes-heading">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                aria-labelledby="notes-heading"
                placeholder="Any notes about this coffee shop"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasCoordinates && <CoffeeShopMap coffeeShops={[coffeeShop]} heightClassName="h-[280px]" />}
              <div className="space-y-2">
                {coffeeShop.address && <p className="font-medium">{coffeeShop.address}</p>}
                <p className="text-muted-foreground">
                  {[coffeeShop.city, coffeeShop.country].filter(Boolean).join(", ") || "No location info"}
                </p>
                {hasCoordinates ? (
                  <p className="text-sm text-muted-foreground">
                    {coffeeShop.latitude}, {coffeeShop.longitude}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add coordinates to see this coffee shop on the map.
                  </p>
                )}
              </div>
              {openStreetMapUrl && (
                <div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={openStreetMapUrl} target="_blank" rel="noopener noreferrer">
                      <MapPinned className="mr-2 h-4 w-4" />
                      Open in OpenStreetMap
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {coffeeShop.website && (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={coffeeShop.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Website
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

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
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/visits/new" search={{ coffeeShopId: String(coffeeShop.id) }}>
              Log a visit here
            </Link>
          </Button>
        </CardContent>
      </Card>

      {coffeeShop.cafeVisits && coffeeShop.cafeVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Visits</CardTitle>
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
                    <span className="font-medium">{visit.drinkName || "Coffee"}</span>
                    <span className="text-muted-foreground text-sm">
                      {new Date(visit.visitedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
