import type { getDetailedStats } from '@/lib/server/stats'

export type DetailedStats = Awaited<ReturnType<typeof getDetailedStats>>
