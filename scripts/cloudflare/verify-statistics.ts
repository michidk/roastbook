import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import type { CloudflareRuntimeBindings } from '@/cloudflare/context.server'
import { db } from '@/db'
import { owned } from '@/db/journal-scope.server'
import { settings } from '@/db/schema'
import { loadDetailedStats } from '@/lib/server/stats-detail.server'
import { parseStatsFilter } from '@/lib/stats-filters'
import { fixture } from './verify-journal'

export async function verifyStatistics(bindings: CloudflareRuntimeBindings) {
  const alice = await fixture(bindings)
  const bob = await fixture(bindings)
  await alice.run(async () => {
    await db
      .update(settings)
      .set({ timeZone: 'America/New_York' })
      .where(owned(settings, eq(settings.id, 1)))
  })
  await bindings.DB.prepare('update bean_purchases set roast_date=? where id=?')
    .bind(new Date('2026-10-24T00:00:00Z').getTime(), alice.purchaseId)
    .run()
  const fixtures = Array.from({ length: 502 }, (_, index) => ({
    stamp: new Date(
      index % 2 ? '2026-11-01T06:30:00Z' : '2026-11-01T05:30:00Z',
    ).getTime(),
    dose: index % 2 ? '20.00' : '10.00',
    yield: index % 2 ? '40.00' : '20.00',
    rating: index % 2 ? 5 : 4,
  }))
  for (let offset = 0; offset < fixtures.length; offset += 50) {
    await bindings.DB.batch(
      fixtures.slice(offset, offset + 50).map((row) =>
        bindings.DB.prepare(`
      insert into brews(owner_id,brewing_method_id,bean_id,bean_purchase_id,brewed_at,dose_grams,yield_grams,rating)
      values (?,?,?,?,?,?,?,?)`).bind(
          alice.ownerId,
          alice.methodId,
          alice.beanId,
          alice.purchaseId,
          row.stamp,
          row.dose,
          row.yield,
          row.rating,
        ),
      ),
    )
  }
  for (const stamp of [
    '2026-11-01T03:59:59.999Z',
    '2026-11-02T05:00:00.000Z',
  ]) {
    await bindings.DB.prepare(
      'insert into brews(owner_id,brewing_method_id,brewed_at,dose_grams,rating) values (?,?,?, ?,5)',
    )
      .bind(alice.ownerId, alice.methodId, new Date(stamp).getTime(), '99.00')
      .run()
  }
  await bindings.DB.prepare(
    'insert into brews(owner_id,brewing_method_id,brewed_at,dose_grams,rating) values (?,?,?, ?,1)',
  )
    .bind(
      bob.ownerId,
      bob.methodId,
      new Date('2026-11-01T06:00:00Z').getTime(),
      '99.00',
    )
    .run()
  const cafe = await bindings.DB.prepare(
    'insert into coffee_shops(owner_id,name) values (?,?) returning id',
  )
    .bind(alice.ownerId, 'Cafe')
    .first<number>('id')
  assert(cafe)
  await bindings.DB.prepare(
    "insert into cafe_visits(owner_id,coffee_shop_id,visited_at,price,currency,rating) values (?,?,?,'4.50','EUR',5)",
  )
    .bind(alice.ownerId, cafe, new Date('2026-11-01T06:00:00Z').getTime())
    .run()
  await alice.run(async () => {
    const stats = await loadDetailedStats(
      parseStatsFilter({
        period: 'custom',
        from: '2026-11-01',
        to: '2026-11-01',
      }),
      { now: new Date('2026-11-02T12:00:00Z') },
    )
    assert.equal(stats.shots.total, 502)
    assert.equal(stats.shots.previousTotal, 1)
    assert.equal(stats.beans.totalGramsUsed, 7530)
    assert.equal(stats.brewing.avgDose, 15)
    assert.equal(stats.brewing.avgRatio, 2)
    assert.deepEqual(stats.consistency.dose, {
      count: 502,
      median: 15,
      p25: 10,
      p75: 20,
    })
    assert.equal(stats.ratings.average, 4.5)
    assert.equal(stats.trend[0]?.count, 502)
    assert.deepEqual(stats.rhythm.cells, [{ weekday: 7, hour: 1, count: 502 }])
    assert.equal(stats.visits.total, 1)
    assert.equal(stats.visits.spend[0]?.total, 4.5)
    assert.equal(stats.places.total, 1)
    assert.equal(stats.exploration.roastAge[0]?.name, '7–14 days')
    assert.equal(stats.cost.home[0]?.total, 602.4)
  })
}
