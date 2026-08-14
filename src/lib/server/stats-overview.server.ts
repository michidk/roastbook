import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { beans, cafeVisits, coffeeShops, settings, shots } from '@/db/schema'
import { toDisplayableDatabaseError } from '@/lib/server/database-error.server'
import { localDateRangeCondition } from '@/lib/server/stats-sql.server'
import { dateKeyInTimeZone } from '@/lib/stats-filters'

export async function loadDashboardStats() {
  try {
    const now = new Date()
    const installationSettings = await db.query.settings.findFirst({
      columns: { timeZone: true },
      where: eq(settings.id, 1),
    })
    const timeZone = installationSettings?.timeZone ?? 'UTC'
    const today = dateKeyInTimeZone(now, timeZone)
    const startOfMonth = `${today.slice(0, 7)}-01`
    const [
      [shotsCount],
      [activeBeansCount],
      [shotsThisMonthCount],
      [visitsCount],
      [coffeeShopsCount],
    ] = await Promise.all([
      db.select({ count: count() }).from(shots),
      db
        .select({ count: count() })
        .from(beans)
        .where(eq(beans.isArchived, false)),
      db
        .select({ count: count() })
        .from(shots)
        .where(
          localDateRangeCondition(
            shots.brewedAt,
            timeZone,
            startOfMonth,
            today,
          ),
        ),
      db.select({ count: count() }).from(cafeVisits),
      db.select({ count: count() }).from(coffeeShops),
    ])

    return {
      totalShots: shotsCount?.count ?? 0,
      activeBeans: activeBeansCount?.count ?? 0,
      shotsThisMonth: shotsThisMonthCount?.count ?? 0,
      cafeVisits: visitsCount?.count ?? 0,
      coffeeShops: coffeeShopsCount?.count ?? 0,
    }
  } catch (error) {
    throw await toDisplayableDatabaseError(error)
  }
}

export async function loadRecentShots(limit: number) {
  try {
    return await db.query.shots.findMany({
      limit,
      orderBy: (shots, { desc }) => [desc(shots.brewedAt)],
      with: {
        bean: { with: { images: true } },
        brewingMethod: true,
        tasteTags: { with: { tasteTag: true } },
      },
    })
  } catch (error) {
    throw await toDisplayableDatabaseError(error)
  }
}
