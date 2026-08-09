import { useMemo, useState } from "react"

export type SortDirection = "asc" | "desc"

type SortablePaginationOptions<T, K extends string> = {
  readonly items: readonly T[]
  readonly initialSortKey: K
  readonly initialSortDirection: SortDirection
  readonly pageSize: number
  readonly compare: (
    left: T,
    right: T,
    key: K,
    direction: SortDirection,
  ) => number
  readonly directionForKey: (key: K) => SortDirection
}

export function useSortablePagination<T, K extends string>({
  items,
  initialSortKey,
  initialSortDirection,
  pageSize,
  compare,
  directionForKey,
}: SortablePaginationOptions<T, K>) {
  const [sortKey, setSortKey] = useState(initialSortKey)
  const [sortDirection, setSortDirection] = useState(initialSortDirection)
  const [page, setPage] = useState(1)

  const sorted = useMemo(
    () => [...items].sort((left, right) => compare(left, right, sortKey, sortDirection)),
    [compare, items, sortDirection, sortKey],
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const showPagination = sorted.length > pageSize
  const paginated = showPagination
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted

  const handleSort = (key: K) => {
    setPage(1)
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection(directionForKey(key))
  }

  return {
    currentPage,
    handleSort,
    paginated,
    setPage,
    showPagination,
    sortDirection,
    sorted,
    sortKey,
    totalPages,
  }
}
