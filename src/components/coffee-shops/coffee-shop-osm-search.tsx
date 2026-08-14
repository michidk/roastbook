import { ExternalLink, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { searchCoffeeShopCandidates } from '@/lib/server/geocoding'

export type CoffeeShopSearchResult = Awaited<
  ReturnType<typeof searchCoffeeShopCandidates>
>[number]

interface CoffeeShopOsmSearchProps {
  readonly onApply: (result: CoffeeShopSearchResult) => void
  readonly initialQuery?: string
}

export function CoffeeShopOsmSearch({
  onApply,
  initialQuery = '',
}: CoffeeShopOsmSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState('')
  const [searchResults, setSearchResults] = useState<CoffeeShopSearchResult[]>(
    [],
  )
  const [selectedSearchResultId, setSelectedSearchResultId] = useState<
    number | null
  >(null)

  const handleSearch = async () => {
    if (isSearching) return

    const normalizedQuery = searchQuery.trim().replace(/\s+/g, ' ')

    if (normalizedQuery.length < 3) {
      setSearchStatus('Enter at least three characters to search OpenStreetMap')
      toast.error('Add a café name or address before searching')
      return
    }

    setIsSearching(true)
    setSearchStatus('Searching OpenStreetMap')

    try {
      const results = await searchCoffeeShopCandidates({
        data: { query: normalizedQuery },
      })
      setSearchResults(results)
      setSelectedSearchResultId(null)
      setSearchStatus(
        results.length === 1
          ? '1 café match found'
          : `${results.length} café matches found`,
      )

      if (results.length === 0) {
        toast.info('No matching cafés found')
      }
    } catch {
      setSearchStatus('OpenStreetMap search failed')
      toast.error('Could not search OpenStreetMap right now')
    } finally {
      setIsSearching(false)
    }
  }

  const handleApply = (result: CoffeeShopSearchResult) => {
    setSelectedSearchResultId(result.id)
    setSearchQuery(result.displayName)
    onApply(result)
    toast.success('Café details applied')
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="search">Search OpenStreetMap</Label>
      <InputGroup
        aria-busy={isSearching}
        className="items-stretch overflow-hidden has-[[data-slot=button]:focus-visible]:border-ring has-[[data-slot=button]:focus-visible]:ring-3 has-[[data-slot=button]:focus-visible]:ring-ring/50 pointer-coarse:box-content pointer-coarse:h-11!"
      >
        <InputGroupInput
          id="search"
          aria-describedby="coffee-shop-search-description"
          placeholder="e.g., Blue Bottle Coffee, San Francisco"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void handleSearch()
          }}
          className="h-11 text-base sm:h-full"
        />
        <InputGroupAddon
          align="inline-end"
          className="h-full p-0 has-[>button]:mr-0"
        >
          <InputGroupButton
            type="button"
            variant="secondary"
            size="sm"
            aria-label={
              isSearching ? 'Searching OpenStreetMap' : 'Search OpenStreetMap'
            }
            onClick={handleSearch}
            disabled={isSearching || searchQuery.trim().length < 3}
            className="relative z-10 h-full w-11 rounded-none p-0 shadow-coffee-inline! focus-visible:ring-0! sm:w-auto sm:px-3 pointer-coarse:h-11!"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isSearching ? 'Searching…' : 'Search café'}
            </span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p
        id="coffee-shop-search-description"
        className="text-xs text-muted-foreground"
      >
        Choose a match to fill in the address, coordinates, and website.
      </p>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {searchStatus}
      </div>
      {searchResults.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-link" />
              Suggested matches
            </div>
            <Badge variant="secondary">{searchResults.length} found</Badge>
          </div>
          <Card size="sm" className="gap-0 rounded-xl border py-0">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="relative flex min-w-0 border-b transition-colors last:border-b-0 hover:bg-muted/50 focus-within:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => handleApply(result)}
                  className="min-w-0 flex-1 p-3 pr-14 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:pr-12"
                >
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    {result.latitude}, {result.longitude}
                  </p>
                </button>
                {result.openStreetMapUrl && (
                  <a
                    href={result.openStreetMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${result.name} in OpenStreetMap`}
                    title="View on OpenStreetMap"
                    className="absolute top-1.5 right-1.5 inline-flex size-11 items-center justify-center rounded-md border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:top-2 sm:right-2 sm:size-8 pointer-coarse:size-11"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </Card>
          <p className="text-xs text-muted-foreground">
            Search results and map data © OpenStreetMap contributors via
            Nominatim.
          </p>
        </div>
      )}
    </div>
  )
}
