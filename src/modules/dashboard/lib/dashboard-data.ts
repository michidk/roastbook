import { getDashboardStats, getRecentShots } from '@/lib/server/stats'

export async function loadDashboardData() {
  const [stats, recentShots] = await Promise.all([
    getDashboardStats(),
    getRecentShots({ data: 5 }),
  ])

  return { stats, recentShots }
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>
