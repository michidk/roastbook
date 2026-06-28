import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { ExternalLink, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createPlace } from "@/lib/server/places"
import { searchPlaceCandidates } from "@/lib/server/geocoding"

type SearchResult = Awaited<ReturnType<typeof searchPlaceCandidates>>[number]

export const Route = createFileRoute("/places/new")({
  component: NewPlacePage,
})

function NewPlacePage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedSearchResultId, setSelectedSearchResultId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    website: "",
    notes: "",
  })

  const handleGeocodeSearch = async () => {
    const normalizedQuery = searchQuery.trim().replace(/\s+/g, " ")

    if (normalizedQuery.length < 3) {
      toast.error("Add a place name or address before searching")
      return
    }

    setIsSearching(true)

    try {
      const results = await searchPlaceCandidates({ data: { query: normalizedQuery } })
      setSearchResults(results)
      setSelectedSearchResultId(null)

      if (results.length === 0) {
        toast.info("No matching places found")
      }
    } catch {
      toast.error("Could not search OpenStreetMap right now")
    } finally {
      setIsSearching(false)
    }
  }

  const applySearchResult = (result: SearchResult) => {
    setSelectedSearchResultId(result.id)
    setFormData((current) => ({
      ...current,
      name: result.name || current.name,
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address ?? current.address,
      city: result.city ?? current.city,
      country: result.country ?? current.country,
      website: result.website ?? current.website,
    }))
    setSearchQuery(result.displayName)
    toast.success("Place details applied")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)

    try {
      const place = await createPlace({
        data: {
          name: formData.name,
          address: formData.address || undefined,
          city: formData.city || undefined,
          country: formData.country || undefined,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          website: formData.website || undefined,
          notes: formData.notes || undefined,
        },
      })
      toast.success("Place created")
      navigate({ to: "/places/$placeId", params: { placeId: String(place.id) } })
    } catch {
      toast.error("Could not save this place")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Place</h1>
        <p className="text-muted-foreground">
          Add a new cafe or coffee spot
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search OpenStreetMap</Label>
              <InputGroup className="h-10 items-stretch">
                <InputGroupInput
                  id="search"
                  placeholder="e.g., Blue Bottle Coffee, San Francisco"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-full text-base"
                />
                <InputGroupAddon align="inline-end" className="pr-1.5">
                  <InputGroupButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGeocodeSearch}
                    disabled={isSearching || searchQuery.trim().length < 3}
                    className="h-8 px-3"
                  >
                    <Search className="h-4 w-4" />
                    {isSearching ? "Searching..." : "Search place"}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                <p>
                  Search OpenStreetMap, then apply a match to prefill the place name, address,
                  website, and coordinates.
                </p>
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
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => applySearchResult(result)}
                          className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{result.name}</p>
                                {isSelected && <Badge>Selected</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{result.displayName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {result.openStreetMapUrl && (
                                <a
                                  href={result.openStreetMapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  OSM
                                </a>
                              )}
                              <Badge variant="outline">Use</Badge>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {result.latitude}, {result.longitude}
                          </p>
                        </button>
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g., San Francisco"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="e.g., USA"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
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
              Add coordinates to pin this place on the map. You can leave these blank and add them
              later.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  inputMode="decimal"
                  placeholder="e.g., 37.7764"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  inputMode="decimal"
                  placeholder="e.g., -122.4231"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
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
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any notes about this place"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/places" })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !formData.name.trim()} className="flex-1">
            {isSubmitting ? "Saving..." : "Add Place"}
          </Button>
        </div>
      </form>
    </div>
  )
}
