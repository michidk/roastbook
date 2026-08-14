import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface SortableTableHeadProps {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onSort: () => void
  align?: 'left' | 'right'
  className?: string
}

export function SortableTableHead({
  label,
  active,
  direction,
  onSort,
  align = 'left',
  className,
}: SortableTableHeadProps) {
  const Icon = active
    ? direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown

  return (
    <TableHead className={cn(align === 'right' && 'text-right', className)}>
      <button
        type="button"
        onClick={onSort}
        className={cn(
          '-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium text-foreground transition-colors hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        <Icon
          className={cn('h-3.5 w-3.5', !active && 'text-muted-foreground/40')}
          aria-hidden="true"
        />
        <span className="sr-only">
          {active
            ? `, sorted ${direction === 'asc' ? 'ascending' : 'descending'}`
            : ', not sorted'}
        </span>
      </button>
    </TableHead>
  )
}
