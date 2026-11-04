import { getDashboardStats, getRecentShots } from '@/lib/client/journal/stats'

export async function loadOverviewData() {
  const [stats, recentShots] = await Promise.all([
    getDashboardStats(),
    getRecentShots({ data: 5 }),
  ])

  return { stats, recentShots }
}

export type OverviewData = Awaited<ReturnType<typeof loadOverviewData>>
