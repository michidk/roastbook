import { Link } from '@tanstack/react-router'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { SortableTableHead } from '@/components/sortable-table-head'
import {
  Card,
  CardContent,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CollectionView } from '@/lib/collection-view'
import { cn } from '@/lib/utils'

export type CollectionMediaTone = 'primary' | 'favorite' | 'muted'

/**
 * A collection can lead each record with a photo, a meaningful icon, or
 * nothing at all. Entities without an image table use `icon`; `none` keeps the
 * copy flush left for text-only collections. `custom` is the escape hatch for
 * an entity that already owns its own visual (a roaster logo, say) and
 * receives the size class the current view expects.
 */
export type CollectionMedia =
  | {
      readonly kind: 'image'
      readonly src: string | null
      readonly alt: string
      readonly fallbackIcon?: LucideIcon
      readonly tone?: CollectionMediaTone
    }
  | {
      readonly kind: 'icon'
      readonly icon: LucideIcon
      readonly tone?: CollectionMediaTone
      readonly filled?: boolean
    }
  | {
      readonly kind: 'custom'
      readonly render: (sizeClassName: string) => ReactNode
    }
  | { readonly kind: 'none' }

export type CollectionEntry = {
  readonly id: string | number
  readonly title: string
  readonly titlePrefix?: ReactNode
  readonly subtitle?: ReactNode
  readonly meta?: ReactNode
  readonly media?: CollectionMedia
  /** Small status icons shown next to the title in both views. */
  readonly flags?: ReactNode
  /** Badge or value pinned to the trailing edge of the card. */
  readonly trailing?: ReactNode
  /** Record action rendered separately from the navigation link. */
  readonly action?: ReactNode
  readonly to: string
  readonly params?: Record<string, string>
  readonly highlight?: boolean
}

export type CollectionColumn<TItem> = {
  readonly key: string
  readonly header: string
  readonly align?: 'left' | 'right'
  /** Set to make the header sortable; passed back through `sort.onSort`. */
  readonly sortKey?: string
  readonly cellClassName?: string
  readonly cell: (item: TItem) => ReactNode
}

export type CollectionSort = {
  readonly key: string
  readonly direction: 'asc' | 'desc'
  readonly onSort: (key: string) => void
}

type CollectionListProps<TItem> = {
  readonly view: CollectionView
  readonly items: readonly TItem[]
  readonly getEntry: (item: TItem) => CollectionEntry
  /** Columns rendered after the automatic linked-title column. */
  readonly columns: readonly CollectionColumn<TItem>[]
  readonly titleHeader?: string
  readonly titleSortKey?: string
  readonly sort?: CollectionSort
}

const toneClassName: Record<CollectionMediaTone, string> = {
  primary: 'bg-primary/10 text-primary',
  favorite: 'bg-favorite/15 text-favorite',
  muted: 'bg-muted text-muted-foreground',
}

function CollectionMediaFigure({
  media,
  size,
}: {
  readonly media: CollectionMedia
  readonly size: 'sm' | 'md'
}) {
  if (media.kind === 'none') return null

  const sizeClassName = size === 'sm' ? 'size-8' : 'size-10'
  const iconClassName = size === 'sm' ? 'size-3.5' : 'size-4'

  if (media.kind === 'custom') {
    return <>{media.render(sizeClassName)}</>
  }

  const tone = toneClassName[media.tone ?? 'primary']

  if (media.kind === 'icon') {
    const Icon = media.icon
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          sizeClassName,
          tone,
        )}
      >
        <Icon
          aria-hidden
          className={cn(iconClassName, media.filled && 'fill-current')}
        />
      </span>
    )
  }

  const FallbackIcon = media.fallbackIcon
  return (
    <ImageWithFallback
      src={media.src ?? undefined}
      alt=""
      loading="lazy"
      className={cn(
        'shrink-0 rounded-full object-cover',
        sizeClassName,
        !media.src && tone,
      )}
      fallback={
        FallbackIcon ? (
          <FallbackIcon aria-hidden className={iconClassName} />
        ) : undefined
      }
    />
  )
}

function CollectionCard({ entry }: { readonly entry: CollectionEntry }) {
  const media = entry.media ?? { kind: 'none' as const }

  return (
    <Card
      className={cn(
        'relative gap-0 overflow-visible p-0 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        entry.highlight && 'ring-2 ring-favorite/35 ring-inset',
      )}
    >
      <Link
        to={entry.to}
        params={entry.params}
        className={cn(
          interactiveCardLinkClassName,
          'flex items-center gap-3 p-4 hover:translate-y-0 motion-reduce:hover:translate-y-0',
          entry.action && 'pr-14',
        )}
      >
        <CollectionMediaFigure media={media} size="md" />
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="flex items-center gap-1.5">
            {entry.titlePrefix}
            <span className="truncate font-display text-base font-bold text-foreground">
              {entry.title}
            </span>
            {entry.flags}
          </span>
          {entry.subtitle ? (
            <span className="block truncate text-sm text-muted-foreground">
              {entry.subtitle}
            </span>
          ) : null}
          {entry.meta ? (
            <span className="block truncate text-sm text-muted-foreground">
              {entry.meta}
            </span>
          ) : null}
        </span>
        {entry.trailing ? (
          <span className="shrink-0">{entry.trailing}</span>
        ) : null}
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
        />
      </Link>
      {entry.action ? (
        <span className="absolute top-1/2 right-1 -translate-y-1/2">
          {entry.action}
        </span>
      ) : null}
    </Card>
  )
}

function CollectionTitleCell({ entry }: { readonly entry: CollectionEntry }) {
  const media = entry.media ?? { kind: 'none' as const }

  return (
    <TableCell className="font-display font-bold text-foreground">
      <span className="flex items-center gap-2">
        <CollectionMediaFigure media={media} size="sm" />
        <Link
          to={entry.to}
          params={entry.params}
          className="inline-flex min-h-11 items-center rounded-sm text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {entry.title}
        </Link>
        {entry.flags}
      </span>
    </TableCell>
  )
}

/**
 * Renders one server-paginated page of records either as cards or as a data
 * table. The table is honoured at every width: a chosen view must not silently
 * change into the other one, so on a phone the table scrolls sideways inside
 * its own container rather than falling back to cards.
 */
export function CollectionList<TItem>({
  view,
  items,
  getEntry,
  columns,
  titleHeader = 'Name',
  titleSortKey,
  sort,
}: CollectionListProps<TItem>) {
  const entries = items.map((item) => ({ item, entry: getEntry(item) }))
  const hasActions = entries.some(({ entry }) => entry.action)

  if (view === 'cards') {
    return (
      <div className="@container">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(({ entry }) => (
            <CollectionCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {titleSortKey && sort ? (
                <SortableTableHead
                  label={titleHeader}
                  active={sort.key === titleSortKey}
                  direction={sort.direction}
                  onSort={() => sort.onSort(titleSortKey)}
                />
              ) : (
                <TableHead>{titleHeader}</TableHead>
              )}
              {columns.map((column) =>
                column.sortKey && sort ? (
                  <SortableTableHead
                    key={column.key}
                    label={column.header}
                    align={column.align}
                    active={sort.key === column.sortKey}
                    direction={sort.direction}
                    onSort={() => {
                      if (column.sortKey) sort.onSort(column.sortKey)
                    }}
                  />
                ) : (
                  <TableHead
                    key={column.key}
                    className={cn(column.align === 'right' && 'text-right')}
                  >
                    {column.header}
                  </TableHead>
                ),
              )}
              {hasActions ? (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ item, entry }) => (
              <TableRow key={entry.id}>
                <CollectionTitleCell entry={entry} />
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      'text-muted-foreground',
                      column.align === 'right' && 'text-right',
                      column.cellClassName,
                    )}
                  >
                    {column.cell(item)}
                  </TableCell>
                ))}
                {hasActions ? (
                  <TableCell className="w-0 text-right">
                    {entry.action}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
