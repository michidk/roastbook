import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { brewingMethods, shots } from '@/db/schema'
import { loadDetailedStats } from '@/lib/server/stats-detail.server'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip
let brewingMethodId: number | undefined

integrationDescribe('detailed statistics contract', () => {
  beforeAll(async () => {
    const [method] = await db
      .insert(brewingMethods)
      .values({ name: `stats-contract-${crypto.randomUUID()}` })
      .returning({ id: brewingMethods.id })
    brewingMethodId = method?.id
    if (!brewingMethodId) throw new Error('Statistics brewing method missing')

    await db.insert(shots).values([
      {
        brewingMethodId,
        brewedAt: new Date('2026-06-10T08:00:00Z'),
        doseGrams: '18',
        yieldGrams: '36',
        rating: 4,
      },
      {
        brewingMethodId,
        brewedAt: new Date('2026-06-11T09:00:00Z'),
        doseGrams: '20',
        yieldGrams: '42',
        rating: 5,
      },
    ])
  })

  afterAll(async () => {
    if (!brewingMethodId) return
    await db.delete(shots).where(eq(shots.brewingMethodId, brewingMethodId))
    await db
      .delete(brewingMethods)
      .where(eq(brewingMethods.id, brewingMethodId))
  })

  test('returns a stable read model for an isolated brewing method', async () => {
    if (!brewingMethodId) throw new Error('Statistics brewing method missing')
    const result = await loadDetailedStats(
      { period: 'all', method: brewingMethodId },
      { now: new Date('2026-06-30T12:00:00Z') },
    )

    expect(result.shots).toEqual({
      total: 2,
      previousTotal: null,
      avgPerDay: 0.1,
    })
    expect(result.brewing).toMatchObject({
      avgDose: 19,
      avgYield: 39,
      avgRatio: 2.05,
    })
    expect(result.ratings).toMatchObject({
      average: 4.5,
      totalRated: 2,
      highRated: 2,
    })
    expect(result.methods).toHaveLength(1)
    expect(result.methods[0]).toMatchObject({
      methodId: brewingMethodId,
      shotCount: 2,
      avgRating: 4.5,
    })
  })
})
