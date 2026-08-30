import type { ReactNode } from 'react'
import { PaginationControls } from '@/components/pagination-controls'

type CollectionResultsProps = {
  readonly children: ReactNode
  readonly emptyMessage: ReactNode
  readonly page: number
  readonly totalItems: number
  readonly totalPages: number
  readonly onPageChange: (page: number) => void
}

export function CollectionResults({
  children,
  emptyMessage,
  page,
  totalItems,
  totalPages,
  onPageChange,
}: CollectionResultsProps) {
  return (
    <>
      {totalItems === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        children
      )}

      {totalPages > 1 ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  )
}
