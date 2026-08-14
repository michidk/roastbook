import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { loadDetailedStats } from '@/lib/server/stats-detail.server'
import {
  loadDashboardStats,
  loadRecentShots,
} from '@/lib/server/stats-overview.server'
import { statsFilterSchema } from '@/lib/stats-filters'

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  loadDashboardStats,
)

export const getRecentShots = createServerFn({ method: 'GET' })
  .validator(z.number().int().min(1).max(50).default(5))
  .handler(({ data: limit }) => loadRecentShots(limit))

export const getDetailedStats = createServerFn({ method: 'GET' })
  .validator(statsFilterSchema)
  .handler(({ data: filter }) => loadDetailedStats(filter))
