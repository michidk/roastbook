import { useMemo, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Plus, Search, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRoasters } from "@/lib/server/roasters"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { EmptyState } from "@/components/EmptyState"
import { SortableTableHead } from "@/components/sortable-table-head"
import { PaginationControls } from "@/components/pagination-controls"

export const Route = createFileRoute("/roasters/")({
  loader: () => getRoasters(),
  component: RoastersPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Roaster = Awaited<ReturnType<typeof getRoasters>>[number]

const PAGE_SIZE = 25

type SortKey = "name" | "location" | "beans"
type SortDirection = "asc" | "desc"

function getRoasterLocation(roaster: Roaster): string {
  return [roaster.location, roaster.country].filter(Boolean).join(", ")
}

function RoastersPage() {
  const roasters = Route.useLoaderData()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [page, setPage] = useState(1)

  // Computed once from the complete, unfiltered list so columns never
  // flicker in/out while searching or paginating.
  const hasLocation = useMemo(
    () => roasters.some((roaster) => getRoasterLocation(roaster).length > 0),
    [roasters],
  )
  const hasNotes = useMemo(() => roasters.some((roaster) => Boolean(roaster.notes)), [roasters])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return roasters
    return roasters.filter((roaster) => roaster.name.toLowerCase().includes(query))
  }, [roasters, search])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "location":
          cmp = getRoasterLocation(a).localeCompare(getRoasterLocation(b))
          break
        case "beans":
          cmp = (a.beans?.length ?? 0) - (b.beans?.length ?? 0)
          break
      }
      return sortDirection === "asc" ? cmp : -cmp
    })
    return copy
  }, [filtered, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const showPagination = sorted.length > PAGE_SIZE
  const paginated = showPagination
    ? sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : sorted

  const handleSort = (key: SortKey) => {
    setPage(1)
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Roasters
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Coffee roasters you buy from
          </p>
        </div>
        <Button asChild>
          <Link to="/roasters/new">
            <Plus className="h-4 w-4" />
            Add roaster
          </Link>
        </Button>
      </header>

      {roasters.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No roasters added yet"
          description="Start by adding your favorite coffee roasters"
          actionLabel="Add roaster"
          actionHref="/roasters/new"
        />
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search roasters by name…"
                  aria-label="Search roasters by name"
                  className="pl-8"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {sorted.length} roaster{sorted.length === 1 ? "" : "s"}
              </p>
            </div>

            {sorted.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No roasters match “{search}”.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      label="Name"
                      active={sortKey === "name"}
                      direction={sortDirection}
                      onSort={() => handleSort("name")}
                    />
                    {hasLocation && (
                      <SortableTableHead
                        label="Location"
                        active={sortKey === "location"}
                        direction={sortDirection}
                        onSort={() => handleSort("location")}
                      />
                    )}
                    <SortableTableHead
                      label="Beans"
                      align="right"
                      active={sortKey === "beans"}
                      direction={sortDirection}
                      onSort={() => handleSort("beans")}
                    />
                    {hasNotes && <TableHead>Notes</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((roaster) => (
                    <RoasterRow
                      key={roaster.id}
                      roaster={roaster}
                      hasLocation={hasLocation}
                      hasNotes={hasNotes}
                      onSelect={() =>
                        navigate({
                          to: "/roasters/$roasterId",
                          params: { roasterId: String(roaster.id) },
                        })
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            )}

            {showPagination && (
              <PaginationControls page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RoasterRow({
  roaster,
  hasLocation,
  hasNotes,
  onSelect,
}: {
  roaster: Roaster
  hasLocation: boolean
  hasNotes: boolean
  onSelect: () => void
}) {
  const beanCount = roaster.beans?.length ?? 0
  const location = getRoasterLocation(roaster)

  return (
    <TableRow
      tabIndex={0}
      role="link"
      aria-label={`View ${roaster.name}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <TableCell className="font-display font-bold text-foreground">
        {roaster.name}
      </TableCell>
      {hasLocation && (
        <TableCell className="text-muted-foreground">{location || "—"}</TableCell>
      )}
      <TableCell className="text-right">
        {beanCount > 0 ? (
          <Badge variant="secondary">{beanCount}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      {hasNotes && (
        <TableCell className="max-w-[420px] truncate text-muted-foreground">
          {roaster.notes || "—"}
        </TableCell>
      )}
    </TableRow>
  )
}
