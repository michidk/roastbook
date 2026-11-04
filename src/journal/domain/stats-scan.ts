export const STATS_SCAN_PAGE_SIZE = 250

/** Consume a stable, increasing-ID scan without retaining database row pages. */
export async function scanStatsRows<Row extends { readonly id: number }>(
  readPage: (afterId: number | undefined) => PromiseLike<readonly Row[]>,
  consume: (row: Row) => void,
) {
  let afterId: number | undefined
  while (true) {
    const rows = await readPage(afterId)
    if (!rows.length) return
    for (const row of rows) consume(row)
    const lastId = rows.at(-1)?.id
    if (lastId === undefined || (afterId !== undefined && lastId <= afterId)) {
      throw new Error('Statistics scan did not advance')
    }
    afterId = lastId
    if (rows.length < STATS_SCAN_PAGE_SIZE) return
  }
}
