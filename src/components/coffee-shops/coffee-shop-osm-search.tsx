import { useState } from "react"
import { ExternalLink, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { searchCoffeeShopCandidates } from "@/lib/server/geocoding"

export type CoffeeShopSearchResult = Awaited<
  ReturnType<typeof searchCoffeeShopCandidates>
>[number]

interface CoffeeShopOsmSearchProps {
  onApply: (result: CoffeeShopSearchResult) => void
  initialQuery?: string
}

export function CoffeeShopOsmSearch({
  onApply,
  initialQuery = "",
}: CoffeeShopOsmSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<CoffeeShopSearchResult[]>(
    []
  )
  const [selectedSearchResultId, setSelectedSearchResultId] = useState<
    number | null
  >(null)

  const handleSearch = async () => {
    const normalizedQuery = searchQuery.trim().replace(/\s+/g, " ")

    if (normalizedQuery.length < 3) {
      toast.error("Add a coffee shop name or address before searching")
      return
    }

    setIsSearching(true)

    try {
      const results = await searchCoffeeShopCandidates({
        data: { query: normalizedQuery },
      })
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

  const handleApply = (result: CoffeeShopSearchResult) => {
    setSelectedSearchResultId(result.id)
    setSearchQuery(result.displayName)
    onApply(result)
    toast.success("Coffee shop details applied")
  }

  return (
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
            aria-label={
              isSearching ? "Searching OpenStreetMap" : "Search OpenStreetMap"
            }
            onClick={handleSearch}
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
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-stretch rounded-lg border bg-card transition-colors hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => handleApply(result)}
                  className="min-w-0 flex-1 p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{result.name}</p>
                        {selectedSearchResultId === result.id && (
                          <Badge>Selected</Badge>
                        )}
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
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Search results and map data © OpenStreetMap contributors via
            Nominatim.
          </p>
        </div>
      )}
    </div>
  )
}
