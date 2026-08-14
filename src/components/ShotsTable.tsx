import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { PaginationControls } from '@/components/pagination-controls'
import { SortableTableHead } from '@/components/sortable-table-head'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import {
  type SortDirection,
  useSortablePagination,
} from '@/hooks/use-sortable-pagination'
import { thumbnailUrl } from '@/lib/image-url'

type Shot = {
  id: number
  brewedAt: Date
  doseGrams: string | null
  yieldGrams: string | null
  shotTimeSeconds: string | null
  rating: number | null
  brewingMethod: {
    id: number
    name: string
  }
  recipe: {
    id: number
    name: string
  } | null
  bean: {
    id: number
    name: string
    images?: Array<{
      storagePath: string
      isThumbnail: boolean | null
    }>
  } | null
}

export interface ShotsTableServerPagination {
  readonly page: number
  readonly totalPages: number
  readonly totalItems: number
  readonly query: string
  readonly scopeLabel?: string | null
  readonly sortKey: SortKey
  readonly sortDirection: SortDirection
  readonly onPageChange: (page: number) => void
  readonly onQueryChange: (query: string) => void
  readonly onClearScope?: () => void
  readonly onSort: (key: SortKey) => void
}

interface ShotsTableProps {
  shots: Shot[]
  hideBean?: boolean
  hideToolbar?: boolean
  serverPagination?: ShotsTableServerPagination
}

const PAGE_SIZE = 25

type SortKey = 'date' | 'bean' | 'dose' | 'yield' | 'time' | 'rating'

function getBeanThumbnail(bean: Shot['bean']): string | null {
  if (!bean?.images?.length) return null
  const thumbnail = bean.images.find((img) => img.isThumbnail) || bean.images[0]
  if (!thumbnail?.storagePath) return null
  return thumbnailUrl(thumbnail.storagePath)
}

function formatShotSummary(
  shot: Shot,
  formatNumber: (value: number | string) => string,
): string {
  const parts: string[] = []
  if (shot.doseGrams && shot.yieldGrams) {
    parts.push(
      `${formatNumber(shot.doseGrams)} g → ${formatNumber(shot.yieldGrams)} g`,
    )
  } else if (shot.doseGrams) {
    parts.push(`${formatNumber(shot.doseGrams)} g dose`)
  } else if (shot.yieldGrams) {
    parts.push(`${formatNumber(shot.yieldGrams)} g yield`)
  } else {
    parts.push('No dose/yield recorded')
  }
  if (shot.shotTimeSeconds)
    parts.push(`${formatNumber(shot.shotTimeSeconds)} s`)
  return parts.join(' · ')
}

function parseNullableFloat(value: string | null): number | null {
  if (value === null) return null
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function compareNullable<Value>(
  a: Value | null,
  b: Value | null,
  direction: SortDirection,
  compare: (left: Value, right: Value) => number,
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const result = compare(a, b)
  return direction === 'asc' ? result : -result
}

function compareShots(
  left: Shot,
  right: Shot,
  key: SortKey,
  direction: SortDirection,
): number {
  switch (key) {
    case 'date': {
      const difference =
        new Date(left.brewedAt).getTime() - new Date(right.brewedAt).getTime()
      return direction === 'asc' ? difference : -difference
    }
    case 'bean':
      return compareNullable(
        left.bean?.name ?? null,
        right.bean?.name ?? null,
        direction,
        (a, b) => a.localeCompare(b),
      )
    case 'dose':
      return compareNullable(
        parseNullableFloat(left.doseGrams),
        parseNullableFloat(right.doseGrams),
        direction,
        (a, b) => a - b,
      )
    case 'yield':
      return compareNullable(
        parseNullableFloat(left.yieldGrams),
        parseNullableFloat(right.yieldGrams),
        direction,
        (a, b) => a - b,
      )
    case 'time':
      return compareNullable(
        parseNullableFloat(left.shotTimeSeconds),
        parseNullableFloat(right.shotTimeSeconds),
        direction,
        (a, b) => a - b,
      )
    case 'rating':
      return compareNullable(
        left.rating,
        right.rating,
        direction,
        (a, b) => a - b,
      )
  }
}

function getShotSortDirection(key: SortKey): SortDirection {
  return key === 'date' || key === 'rating' ? 'desc' : 'asc'
}

export function ShotsTable({
  shots,
  hideBean,
  hideToolbar = false,
  serverPagination,
}: ShotsTableProps) {
  const [search, setSearch] = useState('')

  // Computed once from the complete, unfiltered list so columns never
  // flicker in/out while searching or paginating.
  const hasRating = useMemo(
    () =>
      serverPagination !== undefined ||
      shots.some((shot) => Boolean(shot.rating)),
    [serverPagination, shots],
  )

  const activeSearch = serverPagination?.query ?? search
  const showSearch =
    !hideToolbar &&
    !hideBean &&
    (serverPagination !== undefined || shots.length > PAGE_SIZE)

  const filtered = useMemo(() => {
    if (serverPagination) return shots
    const query = activeSearch.trim().toLowerCase()
    if (!query) return shots
    return shots.filter(
      (shot) =>
        shot.bean?.name.toLowerCase().includes(query) ||
        shot.brewingMethod.name.toLowerCase().includes(query),
    )
  }, [activeSearch, serverPagination, shots])

  const localPagination = useSortablePagination<Shot, SortKey>({
    items: filtered,
    initialSortKey: 'date',
    initialSortDirection: 'desc',
    pageSize: PAGE_SIZE,
    compare: compareShots,
    directionForKey: getShotSortDirection,
  })
  const currentPage = serverPagination?.page ?? localPagination.currentPage
  const handleSort = serverPagination?.onSort ?? localPagination.handleSort
  const paginated = serverPagination ? shots : localPagination.paginated
  const setPage = serverPagination?.onPageChange ?? localPagination.setPage
  const showPagination = serverPagination
    ? serverPagination.totalPages > 1
    : localPagination.showPagination
  const sortDirection =
    serverPagination?.sortDirection ?? localPagination.sortDirection
  const sorted = serverPagination ? shots : localPagination.sorted
  const sortKey = serverPagination?.sortKey ?? localPagination.sortKey
  const totalPages = serverPagination?.totalPages ?? localPagination.totalPages
  const displayedTotal = serverPagination?.totalItems ?? sorted.length

  return (
    <div className="space-y-4">
      {showSearch && (
        <CollectionToolbar
          value={activeSearch}
          onValueChange={(query) => {
            if (serverPagination) {
              serverPagination.onQueryChange(query)
            } else {
              setSearch(query)
              setPage(1)
            }
          }}
          placeholder="Search brews…"
          ariaLabel="Search brews by bean or method"
          resultLabel={`${displayedTotal} ${displayedTotal === 1 ? 'brew' : 'brews'}${serverPagination?.scopeLabel ? ` · ${serverPagination.scopeLabel}` : ''}`}
          actions={
            serverPagination?.scopeLabel && serverPagination.onClearScope ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={serverPagination.onClearScope}
              >
                Clear filter
              </Button>
            ) : undefined
          }
        />
      )}

      {sorted.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {activeSearch
            ? `No brews match “${activeSearch}”.`
            : 'No brews recorded yet.'}
        </p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden" aria-label="Recorded brews">
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
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <SortableTableHead
                    label="Date"
                    active={sortKey === 'date'}
                    direction={sortDirection}
                    onSort={() => handleSort('date')}
                  />
                  {!hideBean && (
                    <SortableTableHead
                      label="Bean"
                      active={sortKey === 'bean'}
                      direction={sortDirection}
                      onSort={() => handleSort('bean')}
                    />
                  )}
                  <th className="h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground">
                    Method
                  </th>
                  <TableHead>Recipe</TableHead>
                  <SortableTableHead
                    label="Dose"
                    align="right"
                    active={sortKey === 'dose'}
                    direction={sortDirection}
                    onSort={() => handleSort('dose')}
                  />
                  <SortableTableHead
                    label="Yield"
                    align="right"
                    active={sortKey === 'yield'}
                    direction={sortDirection}
                    onSort={() => handleSort('yield')}
                  />
                  <SortableTableHead
                    label="Time"
                    align="right"
                    active={sortKey === 'time'}
                    direction={sortDirection}
                    onSort={() => handleSort('time')}
                  />
                  {hasRating && (
                    <SortableTableHead
                      label="Rating"
                      align="right"
                      active={sortKey === 'rating'}
                      direction={sortDirection}
                      onSort={() => handleSort('rating')}
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
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
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
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const beanThumb = getBeanThumbnail(shot.bean)
  const shotDate = formatDate(shot.brewedAt)

  return (
    <li className="list-none">
      <Link
        to="/shots/$shotId"
        params={{ shotId: String(shot.id) }}
        aria-label={`View brew from ${shotDate}`}
        className={interactiveCardLinkClassName}
      >
        <Card
          size="sm"
          className="gap-0 border border-border py-0 transition-colors group-hover:bg-accent/40"
        >
          <CardContent className="flex items-center gap-3 p-4">
            {!hideBean && beanThumb && (
              <ImageWithFallback
                src={beanThumb}
                alt=""
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base font-bold text-foreground">
                  {shotDate}
                </p>
                {hasRating && shot.rating ? (
                  <StarRating
                    value={shot.rating}
                    readOnly
                    variant="compact"
                    sizeClassName="size-3.5"
                    className="shrink-0"
                    ariaLabel="Brew rating"
                  />
                ) : null}
              </div>
              {!hideBean && (
                <p className="truncate text-sm text-muted-foreground">
                  {shot.bean?.name ?? 'No bean recorded'} ·{' '}
                  {shot.brewingMethod.name}
                </p>
              )}
              {shot.recipe ? (
                <p className="truncate text-sm text-muted-foreground">
                  Recipe: {shot.recipe.name}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {formatShotSummary(shot, formatNumber)}
              </p>
            </div>
          </CardContent>
        </Card>
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
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const beanThumb = getBeanThumbnail(shot.bean)
  const shotDate = formatDate(shot.brewedAt)

  return (
    <TableRow className="group relative cursor-pointer">
      <TableCell className="font-medium">
        <Link
          to="/shots/$shotId"
          params={{ shotId: String(shot.id) }}
          className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-label={`View brew from ${shotDate}`}
        >
          <span className="sr-only">View brew from {shotDate}</span>
        </Link>
        <span className="relative text-link underline-offset-4 group-hover:underline">
          {shotDate}
        </span>
      </TableCell>
      {!hideBean && (
        <TableCell>
          {shot.bean ? (
            <Link
              to="/beans/$beanId"
              params={{ beanId: String(shot.bean.id) }}
              className="relative z-10 flex w-fit items-center gap-2 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            '-'
          )}
        </TableCell>
      )}
      <TableCell>{shot.brewingMethod.name}</TableCell>
      <TableCell>
        {shot.recipe ? (
          <Link
            to="/recipes/$recipeId"
            params={{ recipeId: String(shot.recipe.id) }}
            className="relative z-10 inline-flex rounded-sm text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {shot.recipe.name}
          </Link>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell className="text-right">
        {shot.doseGrams ? `${formatNumber(shot.doseGrams)} g` : '-'}
      </TableCell>
      <TableCell className="text-right">
        {shot.yieldGrams ? `${formatNumber(shot.yieldGrams)} g` : '-'}
      </TableCell>
      <TableCell className="text-right">
        {shot.shotTimeSeconds ? `${formatNumber(shot.shotTimeSeconds)} s` : '-'}
      </TableCell>
      {hasRating && (
        <TableCell className="text-right">
          {shot.rating ? (
            <StarRating
              value={shot.rating}
              readOnly
              variant="compact"
              sizeClassName="size-3.5"
              ariaLabel="Brew rating"
            />
          ) : (
            '-'
          )}
        </TableCell>
      )}
    </TableRow>
  )
}
