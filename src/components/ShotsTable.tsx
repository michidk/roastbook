import { useMemo, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { thumbnailUrl } from "@/lib/image-url"
import { ImageWithFallback } from "@/components/image-with-fallback"
import { SortableTableHead } from "@/components/sortable-table-head"
import { PaginationControls } from "@/components/pagination-controls"
import { formatDate } from "@/lib/utils"
import {
  useSortablePagination,
  type SortDirection,
} from "@/hooks/use-sortable-pagination"

type Shot = {
  id: number
  createdAt: Date
  doseGrams: string | null
  yieldGrams: string | null
  shotTimeSeconds: string | null
  rating: number | null
  bean: {
    id: number
    name: string
    images?: Array<{
      storagePath: string
      isThumbnail: boolean | null
    }>
  } | null
}

interface ShotsTableProps {
  shots: Shot[]
  hideBean?: boolean
}

const PAGE_SIZE = 25

type SortKey = "date" | "bean" | "dose" | "yield" | "time" | "rating"

function getBeanThumbnail(bean: Shot["bean"]): string | null {
  if (!bean?.images?.length) return null
  const thumbnail = bean.images.find((img) => img.isThumbnail) || bean.images[0]
  if (!thumbnail?.storagePath) return null
  return thumbnailUrl(thumbnail.storagePath)
}

function formatShotSummary(shot: Shot): string {
  const parts: string[] = []
  if (shot.doseGrams && shot.yieldGrams) {
    parts.push(`${shot.doseGrams}g → ${shot.yieldGrams}g`)
  } else if (shot.doseGrams) {
    parts.push(`${shot.doseGrams}g dose`)
  } else if (shot.yieldGrams) {
    parts.push(`${shot.yieldGrams}g yield`)
  } else {
    parts.push("No dose/yield recorded")
  }
  if (shot.shotTimeSeconds) parts.push(`${shot.shotTimeSeconds}s`)
  return parts.join(" · ")
}

function parseNullableFloat(value: string | null): number | null {
  if (value === null) return null
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return direction === "asc" ? a - b : b - a
}

function compareNullableString(
  a: string | null,
  b: string | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const cmp = a.localeCompare(b)
  return direction === "asc" ? cmp : -cmp
}

function compareShots(
  left: Shot,
  right: Shot,
  key: SortKey,
  direction: SortDirection,
): number {
  switch (key) {
    case "date": {
      const difference =
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      return direction === "asc" ? difference : -difference
    }
    case "bean":
      return compareNullableString(
        left.bean?.name ?? null,
        right.bean?.name ?? null,
        direction,
      )
    case "dose":
      return compareNullableNumber(
        parseNullableFloat(left.doseGrams),
        parseNullableFloat(right.doseGrams),
        direction,
      )
    case "yield":
      return compareNullableNumber(
        parseNullableFloat(left.yieldGrams),
        parseNullableFloat(right.yieldGrams),
        direction,
      )
    case "time":
      return compareNullableNumber(
        parseNullableFloat(left.shotTimeSeconds),
        parseNullableFloat(right.shotTimeSeconds),
        direction,
      )
    case "rating":
      return compareNullableNumber(left.rating, right.rating, direction)
  }
}

function getShotSortDirection(key: SortKey): SortDirection {
  return key === "date" || key === "rating" ? "desc" : "asc"
}

export function ShotsTable({ shots, hideBean }: ShotsTableProps) {
  const [search, setSearch] = useState("")

  // Computed once from the complete, unfiltered list so columns never
  // flicker in/out while searching or paginating.
  const hasRating = useMemo(() => shots.some((shot) => Boolean(shot.rating)), [shots])

  const showSearch = !hideBean && shots.length > PAGE_SIZE

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return shots
    return shots.filter((shot) => shot.bean?.name.toLowerCase().includes(query))
  }, [shots, search])

  const {
    currentPage,
    handleSort,
    paginated,
    setPage,
    showPagination,
    sortDirection,
    sorted,
    sortKey,
    totalPages,
  } = useSortablePagination<Shot, SortKey>({
    items: filtered,
    initialSortKey: "date",
    initialSortDirection: "desc",
    pageSize: PAGE_SIZE,
    compare: compareShots,
    directionForKey: getShotSortDirection,
  })

  if (shots.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No shots recorded yet.</p>
  }

  return (
    <div className="space-y-4">
      {showSearch && (
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
              placeholder="Search by bean name…"
              aria-label="Search shots by bean name"
              className="pl-8"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {sorted.length} shot{sorted.length === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No shots match “{search}”.</p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden" aria-label="Recorded shots">
            {paginated.map((shot) => (
              <MobileShotCard
                key={shot.id}
                shot={shot}
                hideBean={hideBean}
                hasRating={hasRating}
              />
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Date"
                    active={sortKey === "date"}
                    direction={sortDirection}
                    onSort={() => handleSort("date")}
                  />
                  {!hideBean && (
                    <SortableTableHead
                      label="Bean"
                      active={sortKey === "bean"}
                      direction={sortDirection}
                      onSort={() => handleSort("bean")}
                    />
                  )}
                  <SortableTableHead
                    label="Dose"
                    align="right"
                    active={sortKey === "dose"}
                    direction={sortDirection}
                    onSort={() => handleSort("dose")}
                  />
                  <SortableTableHead
                    label="Yield"
                    align="right"
                    active={sortKey === "yield"}
                    direction={sortDirection}
                    onSort={() => handleSort("yield")}
                  />
                  <SortableTableHead
                    label="Time"
                    align="right"
                    active={sortKey === "time"}
                    direction={sortDirection}
                    onSort={() => handleSort("time")}
                  />
                  {hasRating && (
                    <SortableTableHead
                      label="Rating"
                      align="right"
                      active={sortKey === "rating"}
                      direction={sortDirection}
                      onSort={() => handleSort("rating")}
                    />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((shot) => (
                  <ShotRow
                    key={shot.id}
                    shot={shot}
                    hideBean={hideBean}
                    hasRating={hasRating}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {showPagination && (
        <PaginationControls page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}

function MobileShotCard({
  shot,
  hideBean,
  hasRating,
}: {
  shot: Shot
  hideBean?: boolean
  hasRating: boolean
}) {
  const beanThumb = getBeanThumbnail(shot.bean)
  const shotDate = formatDate(shot.createdAt)

  return (
    <li className="list-none">
      <Link
        to="/shots/$shotId"
        params={{ shotId: String(shot.id) }}
        aria-label={`View shot from ${shotDate}`}
        className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-coffee transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {!hideBean && beanThumb && (
          <ImageWithFallback
            src={beanThumb}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-base font-bold text-foreground">{shotDate}</p>
            {hasRating && shot.rating ? (
              <Badge variant="secondary" className="shrink-0">
                {shot.rating}/5
              </Badge>
            ) : null}
          </div>
          {!hideBean && (
            <p className="truncate text-sm text-muted-foreground">
              {shot.bean?.name ?? "No bean recorded"}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{formatShotSummary(shot)}</p>
        </div>
      </Link>
    </li>
  )
}

function ShotRow({
  shot,
  hideBean,
  hasRating,
}: {
  shot: Shot
  hideBean?: boolean
  hasRating: boolean
}) {
  const navigate = useNavigate()
  const beanThumb = getBeanThumbnail(shot.bean)
  const shotDate = formatDate(shot.createdAt)

  const goToShot = () => {
    navigate({ to: "/shots/$shotId", params: { shotId: String(shot.id) } })
  }

  return (
    <TableRow
      tabIndex={0}
      role="link"
      aria-label={`View shot from ${shotDate}`}
      onClick={goToShot}
      onKeyDown={(event) => {
        // Ignore keydowns that bubbled up from the nested bean Link so its
        // own Enter-to-navigate isn't hijacked into navigating to the shot.
        if (event.target !== event.currentTarget) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          goToShot()
        }
      }}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <TableCell className="font-medium">{shotDate}</TableCell>
      {!hideBean && (
        <TableCell>
          {shot.bean ? (
            <Link
              to="/beans/$beanId"
              params={{ beanId: String(shot.bean.id) }}
              onClick={(event) => event.stopPropagation()}
              className="flex w-fit items-center gap-2 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {beanThumb && (
                <ImageWithFallback
                  src={beanThumb}
                  alt=""
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <span>{shot.bean.name}</span>
            </Link>
          ) : (
            "-"
          )}
        </TableCell>
      )}
      <TableCell className="text-right">
        {shot.doseGrams ? `${shot.doseGrams}g` : "-"}
      </TableCell>
      <TableCell className="text-right">
        {shot.yieldGrams ? `${shot.yieldGrams}g` : "-"}
      </TableCell>
      <TableCell className="text-right">
        {shot.shotTimeSeconds ? `${shot.shotTimeSeconds}s` : "-"}
      </TableCell>
      {hasRating && (
        <TableCell className="text-right">
          {shot.rating ? <Badge variant="secondary">{shot.rating}/5</Badge> : "-"}
        </TableCell>
      )}
    </TableRow>
  )
}
