import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type {
  JournalCommand,
  JournalState,
} from '@roastbook/journal-domain/state'
import { eq } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { allocateJournalIds } from '@/db/journal-mutations.server'
import * as tables from '@/db/schema'
import { parseStatsFilter } from '@/lib/stats-filters'
import { executeCommand } from '@/modules/journal/commands'
import { readJournal } from '@/modules/journal/reads'
import {
  applyJournalCommand,
  loadJournalSnapshot,
} from './journal-snapshot.server'
import { shotListSchema } from './shot-list-contract.server'
import {
  getBeanShotAnalyticsOperation,
  getShotGroupsOperation,
  getShotPageOperation,
} from './shots-operations.server'
import { loadDetailedStats } from './stats-detail.server'
import { loadDashboardStats } from './stats-overview.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const identity: JournalIdentity = {
  id: crypto.randomUUID(),
  email: `${crypto.randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
suite('shared read contracts match PostgreSQL after local mutations', () => {
  let state: JournalState
  beforeAll(async () => {
    await getControlDb().insert(tables.authUsers).values({
      id: identity.id,
      email: identity.email,
      emailVerified: true,
      journalInitializedAt: new Date(),
    })
    state = await withJournal(identity, loadJournalSnapshot)
    state.identifiers = {}
    await withJournal(identity, async () => {
      for (const name of [
        'beans',
        'beanPurchases',
        'brewingMethods',
        'shots',
        'recipes',
        'coffeeShops',
        'cafeVisits',
        'roasters',
        'tasteTags',
        'shotTasteTags',
      ] as const)
        if (state.identifiers)
          state.identifiers[name] = await allocateJournalIds(tables[name], 20)
    })
    // Keep the correlated purchase query honest even on an empty database.
    if (state.identifiers?.beanPurchases)
      state.identifiers.beanPurchases = state.identifiers.beanPurchases.filter(
        (id) => id !== state.identifiers?.beans?.[0],
      )
  })
  afterAll(async () => {
    const db = getControlDb()
    for (const name of [
      'shotTasteTags',
      'shots',
      'recipes',
      'cafeVisits',
      'coffeeShops',
      'beanPurchases',
      'beans',
      'roasters',
      'brewingMethods',
      'tasteTags',
      'settings',
      'journalCommandReceipts',
      'journalSyncRevisions',
    ] as const)
      await db.delete(tables[name]).where(eq(tables[name].ownerId, identity.id))
    await db
      .delete(tables.authUsers)
      .where(eq(tables.authUsers.id, identity.id))
  })
  async function commit(operation: string, data: JournalCommand['data']) {
    const command = {
      id: crypto.randomUUID(),
      operation,
      data,
      createdAt: new Date().toISOString(),
      allocations: {},
    }
    const local = executeCommand(state, command).state
    const remote = await withJournal(identity, () =>
      applyJournalCommand(command, state.serverRevision),
    )
    expect(remote.tables).toEqual(local.tables)
    state = { ...remote, identifiers: local.identifiers }
  }
  test('filters, groups, relationships, analytics, counts and statistics use complete changed data', async () => {
    await commit('brewing-methods/createBrewingMethod', {
      name: 'Espresso',
      description: null,
      enabledParameters: ['doseGrams', 'yieldGrams', 'shotTimeSeconds'],
      timerEnabled: false,
      drinkTypeIds: [],
    })
    const methodId = state.tables.brewingMethods[0]?.id ?? 0
    await commit('beans/createBean', {
      name: 'Coffee',
      weight: '250',
      price: '19.99',
      priceCurrency: 'EUR',
    })
    const beanId = state.tables.beans[0]?.id ?? 0
    const beanPurchaseId = state.tables.beanPurchases[0]?.id ?? 0
    expect(beanPurchaseId).not.toBe(beanId)
    await commit('shots/createShot', {
      brewingMethodId: methodId,
      beanId,
      beanPurchaseId,
      doseGrams: '18',
      yieldGrams: '36',
      rating: 4,
      brewedAt: '2026-11-01T09:00:00.000Z',
    })
    await commit('shots/createShot', {
      brewingMethodId: methodId,
      beanId,
      beanPurchaseId,
      doseGrams: '19',
      yieldGrams: '38',
      rating: 5,
      brewedAt: '2026-11-02T09:00:00.000Z',
    })
    await commit('shots/createShot', {
      brewingMethodId: methodId,
      doseGrams: '17',
      yieldGrams: '34',
      brewedAt: '2026-11-03T09:00:00.000Z',
    })
    await commit('beans/updateBean', { id: beanId, name: 'Renamed coffee' })
    await withJournal(identity, async () => {
      expect(readJournal(state, 'stats/getDashboardStats', undefined)).toEqual(
        await loadDashboardStats(),
      )
      for (const input of [
        {},
        { rating: 4 },
        { rating: 0 },
        { beanId: 0 },
        { beanId },
        { methodId },
        { sort: 'dose', direction: 'asc' },
      ]) {
        const data = shotListSchema.parse(input)
        const remote = await getShotPageOperation(data)
        expect(readJournal(state, 'shots/getShotPage', data)).toMatchObject(
          remote,
        )
      }
      const analytics = await getBeanShotAnalyticsOperation(beanId)
      expect(
        readJournal(state, 'shots/getBeanShotAnalytics', beanId),
      ).toMatchObject(analytics)
      expect(readJournal(state, 'shots/getShotGroups', {})).toMatchObject(
        await getShotGroupsOperation({ page: 1 }),
      )
      const filter = parseStatsFilter({ period: 'all' })
      const stats = await loadDetailedStats(filter)
      expect(readJournal(state, 'stats/getDetailedStats', filter)).toEqual(
        stats,
      )
    })
  })
})
