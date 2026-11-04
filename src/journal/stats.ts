import { z } from 'zod'
import { loadDetailedStats } from '@/journal/domain/stats-detail'
import {
  loadDashboardStats,
  loadRecentShots,
} from '@/journal/domain/stats-overview'
import { journalRead } from '@/journal/function'
import { parseStatsFilter } from '@/lib/stats-filters'

export const getDashboardStats = journalRead('stats/getDashboardStats').handler(
  loadDashboardStats,
)

export const getRecentShots = journalRead('stats/getRecentShots')
  .validator(z.number().int().min(1).max(50).default(5))
  .handler(({ data: limit }) => loadRecentShots(limit))

export const getDetailedStats = journalRead('stats/getDetailedStats')
  .validator(parseStatsFilter)
  .handler(({ data: filter }) => loadDetailedStats(filter))
