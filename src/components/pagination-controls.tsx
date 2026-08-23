import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPaginationItems, type PaginationItem } from '@/lib/pagination'
import { cn } from '@/lib/utils'

interface PaginationControlsProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const mobileItems = getPaginationItems(page, totalPages, 5)
  const desktopItems = getPaginationItems(page, totalPages, 7)

  return (
    <nav
      className="flex flex-col items-center gap-3 border-t border-border/70 pt-4 sm:flex-row sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex max-w-full items-center justify-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>

        <PaginationItems
          items={mobileItems}
          page={page}
          onPageChange={onPageChange}
          className="flex sm:hidden"
        />
        <PaginationItems
          items={desktopItems}
          page={page}
          onPageChange={onPageChange}
          className="hidden sm:flex"
        />

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}

function PaginationItems({
  items,
  page,
  onPageChange,
  className,
}: {
  readonly items: readonly PaginationItem[]
  readonly page: number
  readonly onPageChange: (page: number) => void
  readonly className?: string
}) {
  return (
    <ol className={cn('items-center gap-1', className)}>
      {items.map((item) => (
        <li key={item}>
          {typeof item === 'number' ? (
            <Button
              type="button"
              variant={item === page ? 'default' : 'ghost'}
              size="icon-sm"
              onClick={() => onPageChange(item)}
              aria-label={`Go to page ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Button>
          ) : (
            <span
              className="flex w-5 items-center justify-center text-sm text-muted-foreground"
              aria-hidden="true"
            >
              …
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
