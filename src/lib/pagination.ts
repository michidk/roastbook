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
