export function getPaginationWindow(
  totalItems: number,
  requestedPage: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(requestedPage, totalPages)

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    offset: (page - 1) * pageSize,
  }
}

export type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis'

/**
 * Build a compact, stable list of page links. The supported sizes leave room
 * for the first and last page, ellipses, and either zero or one sibling on
 * each side of the current page.
 */
export function getPaginationItems(
  page: number,
  totalPages: number,
  maxItems: 5 | 7 = 7,
): PaginationItem[] {
  if (totalPages <= maxItems) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const edgeSize = maxItems - 2
  const edgeThreshold = (maxItems + 1) / 2

  if (page <= edgeThreshold) {
    return [
      ...Array.from({ length: edgeSize }, (_, index) => index + 1),
      'end-ellipsis',
      totalPages,
    ]
  }

  if (page >= totalPages - edgeThreshold + 1) {
    return [
      1,
      'start-ellipsis',
      ...Array.from(
        { length: edgeSize },
        (_, index) => totalPages - edgeSize + index + 1,
      ),
    ]
  }

  const siblingCount = (maxItems - 5) / 2
  return [
    1,
    'start-ellipsis',
    ...Array.from(
      { length: siblingCount * 2 + 1 },
      (_, index) => page - siblingCount + index,
    ),
    'end-ellipsis',
    totalPages,
  ]
}
