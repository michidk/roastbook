import * as remote from '@/lib/server/stats'
import { journalFunction } from '../journal-function'
export const getDashboardStats = journalFunction(
  remote.getDashboardStats,
  'stats/getDashboardStats',
  false,
)
export const getRecentShots = journalFunction(
  remote.getRecentShots,
  'stats/getRecentShots',
  false,
)
export const getDetailedStats = journalFunction(
  remote.getDetailedStats,
  'stats/getDetailedStats',
  false,
)
