import { afterAll, describe, expect, test } from 'bun:test'
import postgres from 'postgres'
import { pullRecipes, pushRecipes } from './replication'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const sql = testDatabaseUrl ? postgres(testDatabaseUrl, { max: 1 }) : undefined
const integrationDescribe = testDatabaseUrl ? describe : describe.skip

function database() {
  if (!sql) throw new Error('TEST_DATABASE_URL is required')
  return sql
}

afterAll(async () => {
  await sql?.end()
})

integrationDescribe('recipe replication', () => {
  test('pulls pages and handles create, retry, conflict, update, and delete', async () => {
    const suffix = crypto.randomUUID()
    const syncId = crypto.randomUUID()
    const name = `replication-${suffix}`
    const [method] = await database()<[{ id: number }]>`
      insert into brewing_methods (name) values (${name}) returning id
    `

    try {
      const firstPage = await pullRecipes({ batchSize: 1 })
      expect(firstPage.documents.length).toBeLessThanOrEqual(1)
      if (firstPage.checkpoint.recipeId) {
        const secondPage = await pullRecipes({
          checkpoint: firstPage.checkpoint,
          batchSize: 1,
        })
        expect(secondPage.documents.length).toBeLessThanOrEqual(1)
      }

      const before = await database()<[{ sequence: number }]>`
        select coalesce(max(sequence), 0)::int as sequence
        from replication_changes
        where entity = 'recipes'
      `
      const document = {
        id: syncId,
        syncId,
        name,
        brewingMethodId: method.id,
        beanId: null,
        drinkTypeId: null,
        serverRevision: 0,
        updatedAt: new Date().toISOString(),
      }

      expect(
        await pushRecipes({ rows: [{ newDocumentState: document }] }),
      ).toEqual([])
      expect(
        await pushRecipes({ rows: [{ newDocumentState: document }] }),
      ).toEqual([])

      const created = await pullRecipes({
        checkpoint: before[0],
        batchSize: 100,
      })
      expect(
        created.documents.find((item) => item.syncId === syncId),
      ).toMatchObject({
        name,
        _deleted: false,
      })

      const conflict = await pushRecipes({
        rows: [
          {
            assumedMasterState: document,
            newDocumentState: {
              ...document,
              name: `${name}-other`,
              serverRevision: 1,
            },
          },
        ],
      })
      expect(conflict).toHaveLength(0)

      const staleConflict = await pushRecipes({
        rows: [
          {
            assumedMasterState: document,
            newDocumentState: {
              ...document,
              name: `${name}-stale`,
              serverRevision: 1,
            },
          },
        ],
      })
      expect(staleConflict[0]).toMatchObject({ name: `${name}-other` })

      const current = staleConflict[0]
      expect(current).toBeDefined()
      const deleted = await pushRecipes({
        rows: [
          {
            assumedMasterState: current,
            newDocumentState: {
              ...current,
              name: '',
              _deleted: true,
            },
          },
        ],
      })
      expect(deleted).toEqual([])

      const changes = await pullRecipes({
        checkpoint: created.checkpoint,
        batchSize: 100,
      })
      expect(changes.documents.at(-1)).toMatchObject({
        syncId,
        _deleted: true,
      })
    } finally {
      await database()`
        delete from replication_changes where document_id = ${syncId}
      `
      await database()`delete from recipes where sync_id = ${syncId}`
      await database()`delete from brewing_methods where id = ${method.id}`
    }
  })
})
