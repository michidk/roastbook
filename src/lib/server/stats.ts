import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createAsyncTtlCache } from '@/lib/server/stats-cache'
import { loadDetailedStats } from '@/lib/server/stats-detail.server'
import {
  loadDashboardStats,
  loadRecentShots,
} from '@/lib/server/stats-overview.server'
import { parseStatsFilter } from '@/lib/stats-filters'

const loadDetailedStatsCached = createAsyncTtlCache({
  load: loadDetailedStats,
  key: (filter) =>
    JSON.stringify([
      filter.period,
      filter.method ?? null,
      filter.bean ?? null,
      filter.from ?? null,
      filter.to ?? null,
    ]),
  // Match the route's stale time so refreshes across tabs/users can reuse the
  // expensive query burst without retaining noticeably stale statistics.
  ttlMs: 15_000,
  maxEntries: 64,
})

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  loadDashboardStats,
)

export const getRecentShots = createServerFn({ method: 'GET' })
  .validator(z.number().int().min(1).max(50).default(5))
  .handler(({ data: limit }) => loadRecentShots(limit))

export const getDetailedStats = createServerFn({ method: 'GET' })
  .validator(parseStatsFilter)
  .handler(({ data: filter }) => loadDetailedStatsCached(filter))
