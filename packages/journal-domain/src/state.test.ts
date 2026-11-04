import { expect, test } from 'bun:test'
import { emptyJournalTables, JournalTransaction } from './state'

test('related writes commit together and preserve the source on failure', () => {
  const source = emptyJournalTables()
  const tx = new JournalTransaction(source)
  const roaster = tx.insert('roasters', { name: 'Roaster' })
  const bean = tx.insert('beans', { name: 'Coffee', roasterId: roaster.id })
  tx.insert('beanPurchases', { beanId: bean.id })
  const saved = tx.finish()
  expect(saved.beans).toHaveLength(1)
  expect(source.beans).toHaveLength(0)
  const failed = new JournalTransaction(saved)
  failed.insert('beanPurchases', { beanId: 999 })
  expect(() => failed.finish()).toThrow('related record')
  expect(saved.beanPurchases).toHaveLength(1)
})

test('delete cascades and nulls relationships using the journal constraints', () => {
  const tx = new JournalTransaction(emptyJournalTables())
  const roaster = tx.insert('roasters', { name: 'Roaster' })
  const bean = tx.insert('beans', { name: 'Coffee', roasterId: roaster.id })
  tx.insert('beanPurchases', { beanId: bean.id })
  tx.delete('roasters', roaster.id)
  expect(tx.get('beans', bean.id).roasterId).toBeNull()
  expect(() =>
    new JournalTransaction(tx.finish()).delete('beans', bean.id),
  ).toThrow('still in use')
  tx.deleteWhere('beanPurchases', (purchase) => purchase.beanId === bean.id)
  tx.delete('beans', bean.id)
  expect(tx.finish().beanPurchases).toHaveLength(0)
})

test('gear detail primary keys and unique journal values retain their constraints', () => {
  const tx = new JournalTransaction(emptyJournalTables())
  const gear = tx.insert('gear', {
    name: 'Grinder',
    brand: 'Brand',
    model: 'Model',
    type: 'grinder',
  })
  tx.insert('grinderDetails', { gearId: gear.id })
  expect(tx.get('grinderDetails', gear.id).gearId).toBe(gear.id)
  tx.insert('tasteTags', { name: 'Berry', category: 'flavor' })
  tx.insert('tasteTags', { name: 'Berry', category: 'flavor' })
  expect(() => tx.finish()).toThrow('already exists')
})

test('partial unique constraints reject two thumbnail choices and two current settings', () => {
  const tx = new JournalTransaction(emptyJournalTables())
  const gear = tx.insert('gear', {
    name: 'Machine',
    brand: 'Brand',
    model: 'Model',
    type: 'espresso_machine',
  })
  for (let index = 0; index < 2; index++)
    tx.insert('gearImages', {
      gearId: gear.id,
      storagePath: `${index}.webp`,
      isThumbnail: true,
    })
  expect(() => tx.finish()).toThrow('already exists')
  tx.deleteWhere('gearImages', () => true)
  const first = tx.insert('espressoMachineSettingRevisions', {
    gearId: gear.id,
    kind: 'owner',
  })
  tx.insert('espressoMachineSettingRevisions', {
    gearId: gear.id,
    kind: 'owner',
  })
  expect(() => tx.finish()).toThrow('already exists')
  tx.update('espressoMachineSettingRevisions', first.id, {
    supersededAt: new Date().toISOString(),
  })
  expect(tx.finish().espressoMachineSettingRevisions).toHaveLength(2)
})
