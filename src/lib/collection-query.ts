export function escapedContainsPattern(query: string): string {
  return `%${query.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
}

export function resolvePagination(
  totalItems: number,
  requestedPage: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(requestedPage, totalPages)
  return { page, pageSize, totalItems, totalPages }
}
