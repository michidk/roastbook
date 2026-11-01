import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import { createRxDatabase, removeRxDatabase } from 'rxdb'
import { decodeStoredValue, encodeStoredValue } from './stored-values'

test('dates in nested payloads survive closing and reopening Dexie storage', async () => {
  const name = `stored-values-${crypto.randomUUID()}`
  const { getRxStorageDexie } = await import('rxdb/plugins/storage-dexie')
  const storage = getRxStorageDexie()
  const open = async () => {
    const database = await createRxDatabase({ name, storage })
    await database.addCollections({
      values: {
        schema: {
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: { id: { type: 'string', maxLength: 100 }, data: {} },
          required: ['id'],
        },
      },
    })
    const values = database.collections.values
    if (!values) throw new Error('Expected the values collection')
    return { database, values }
  }
  const original = {
    brewedAt: new Date('2026-10-25T09:30:00.000Z'),
    purchases: [{ purchasedAt: new Date('2026-10-20T00:00:00.000Z') }],
    notes: '2026-10-25T09:30:00.000Z',
  }
  const first = await open()
  try {
    await first.values.insert({
      id: 'brew',
      data: encodeStoredValue(original),
    })
  } finally {
    await first.database.close()
  }
  const second = await open()
  try {
    const document = await second.values.findOne('brew').exec()
    expect(decodeStoredValue(document?.toJSON().data)).toEqual(original)
  } finally {
    await second.database.close()
    await removeRxDatabase(name, storage)
  }
})
