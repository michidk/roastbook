import * as remote from '@/lib/server/stats'
import { journalRead } from '../journal-function'
export const getDashboardStats = journalRead(
  remote.getDashboardStats,
  'stats/getDashboardStats',
)
export const getRecentShots = journalRead(
  remote.getRecentShots,
  'stats/getRecentShots',
)
export const getDetailedStats = journalRead(
  remote.getDetailedStats,
  'stats/getDetailedStats',
)
