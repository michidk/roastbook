import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import { ClientJournal } from '@roastbook/journal-client/journal'
import {
  emptyJournalTables,
  JournalTransaction,
  journalStateSchema,
} from '@roastbook/journal-domain/state'
import { executeCommand } from '@/modules/journal/commands'
import { readJournal } from '@/modules/journal/reads'

test('the product local journal saves a brew, tasting and a recipe before reconnecting', async () => {
  const tx = new JournalTransaction(emptyJournalTables())
  tx.insert('settings', { id: 1 })
  const method = tx.insert('brewingMethods', {
    name: 'Espresso',
    enabledParameters: ['doseGrams', 'yieldGrams'],
    timerEnabled: false,
  })
  const bootstrap = journalStateSchema.parse({
    format: 1,
    revision: 0,
    serverRevision: 0,
    tables: tx.finish(),
    media: {},
    pending: [],
  })
  const journal = await ClientJournal.open({
    name: `journal${crypto.randomUUID().replaceAll('-', '')}`,
    bootstrap: async () => bootstrap,
    execute: executeCommand,
    transport: {
      load: async () => bootstrap,
      send: async () => {
        throw new TypeError('Offline')
      },
    },
  })
  try {
    await journal.command('shots/createShot', {
      brewingMethodId: method.id,
      doseGrams: '18',
      yieldGrams: '36',
    })
    const brew = (await journal.read()).tables.shots[0]
    if (!brew) throw new Error('Brew was not saved')
    await journal.command('shots/updateShot', {
      id: brew.id,
      brewingMethodId: method.id,
      doseGrams: '18',
      yieldGrams: '36',
      rating: 5,
      baseRevision: brew.revision,
    })
    await journal.command('recipes/saveShotAsRecipe', {
      shotId: brew.id,
      name: 'Morning recipe',
    })
    const state = await journal.read()
    expect(state.tables.recipes).toHaveLength(1)
    expect(
      readJournal(state, 'stats/getDashboardStats', undefined),
    ).toHaveProperty('totalShots', 1)
    expect(readJournal(state, 'shots/getShot', brew.id)).toHaveProperty(
      'rating',
      5,
    )
    expect(state.pending).toHaveLength(3)
    await expect(journal.synchronize()).rejects.toThrow('Offline')
    expect((await journal.read()).pending).toHaveLength(3)
  } finally {
    await journal.close()
  }
})
