import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq, getTableColumns, getTableName, is, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { PgTable } from 'drizzle-orm/pg-core'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import * as postgresSchema from '../schema'
import { normalizeDecimal } from './columns'
import * as schema from './schema'

const migrations = await Promise.all(
  (await Array.fromAsync(new Bun.Glob('drizzle-d1/*.sql').scan()))
    .sort()
    .map((path) => Bun.file(path).text()),
)

let sqlite: Database
let db: ReturnType<typeof createDatabase>

function createDatabase(connection: Database) {
  return drizzle(connection, { schema })
}

beforeEach(() => {
  sqlite = new Database(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  for (const migration of migrations) sqlite.exec(migration)
  db = createDatabase(sqlite)
  db.insert(schema.authUsers)
    .values([
      { id: 'alice', email: 'alice@example.com' },
      { id: 'bob', email: 'bob@example.com' },
    ])
    .run()
})

afterEach(() => sqlite.close())

describe('D1 journal schema', () => {
  test('preserves PostgreSQL tables and columns with mandatory explicit owners', () => {
    const sqliteTables = new Map(
      Object.values(schema)
        .filter((value) => is(value, SQLiteTable))
        .map((table) => [getTableName(table), table]),
    )
    let ownedCount = 0
    for (const table of Object.values(postgresSchema)) {
      if (!is(table, PgTable)) continue
      const sqliteTable = sqliteTables.get(getTableName(table))
      if (!sqliteTable)
        throw new Error(`Missing D1 table ${getTableName(table)}`)
      const columns = getTableColumns(sqliteTable)
      expect(Object.keys(columns).sort()).toEqual(
        Object.keys(getTableColumns(table)).sort(),
      )
      if ('ownerId' in columns) {
        ownedCount += 1
        expect(columns.ownerId?.notNull).toBe(true)
        expect(columns.ownerId?.hasDefault).toBe(false)
      }
    }
    expect(ownedCount).toBe(50)
    expect(sqliteTables.size).toBe(72)
    expect(() =>
      sqlite.exec("insert into beans (name) values ('Ownerless')"),
    ).toThrow('Journal owner is unavailable')
  })

  test('permits separate singleton settings and unique names per user', () => {
    for (const ownerId of ['alice', 'bob']) {
      db.insert(schema.settings).values({ ownerId }).run()
      db.insert(schema.brewingMethods)
        .values({ ownerId, name: 'Espresso' })
        .run()
    }
    expect(db.select().from(schema.settings).all()).toHaveLength(2)
    expect(() =>
      db.insert(schema.settings).values({ ownerId: 'alice' }).run(),
    ).toThrow('UNIQUE')
    expect(() =>
      db
        .insert(schema.brewingMethods)
        .values({ ownerId: 'alice', name: 'Espresso' })
        .run(),
    ).toThrow('UNIQUE')
  })

  test('rejects links to another journal on inserts and updates', () => {
    const roaster = db
      .insert(schema.roasters)
      .values({ ownerId: 'alice', name: 'Private roaster' })
      .returning()
      .get()
    expect(() =>
      db
        .insert(schema.beans)
        .values({ ownerId: 'bob', name: 'Leak', roasterId: roaster.id })
        .run(),
    ).toThrow('FOREIGN KEY')
    const bean = db
      .insert(schema.beans)
      .values({ ownerId: 'bob', name: 'Own coffee' })
      .returning()
      .get()
    expect(() =>
      db
        .update(schema.beans)
        .set({ roasterId: roaster.id })
        .where(eq(schema.beans.id, bean.id))
        .run(),
    ).toThrow('FOREIGN KEY')
    db.update(schema.beans)
      .set({ ownerId: 'alice', roasterId: roaster.id })
      .where(eq(schema.beans.id, bean.id))
      .run()
    expect(() =>
      db
        .update(schema.roasters)
        .set({ ownerId: 'bob' })
        .where(eq(schema.roasters.id, roaster.id))
        .run(),
    ).toThrow('FOREIGN KEY')
  })

  test('preserves SET NULL without nulling the owner and retains restricted parents', () => {
    const roaster = db
      .insert(schema.roasters)
      .values({ ownerId: 'alice', name: 'Roaster' })
      .returning()
      .get()
    const bean = db
      .insert(schema.beans)
      .values({ ownerId: 'alice', name: 'Coffee', roasterId: roaster.id })
      .returning()
      .get()
    db.delete(schema.roasters).where(eq(schema.roasters.id, roaster.id)).run()
    expect(db.select().from(schema.beans).get()).toMatchObject({
      ownerId: 'alice',
      roasterId: null,
    })
    db.insert(schema.beanPurchases)
      .values({ ownerId: 'alice', beanId: bean.id })
      .run()
    expect(() =>
      db.delete(schema.beans).where(eq(schema.beans.id, bean.id)).run(),
    ).toThrow('FOREIGN KEY')
  })

  test('cascades same-owner child rows', () => {
    const group = db
      .insert(schema.drinkOptionGroups)
      .values({ ownerId: 'alice', name: 'Milk' })
      .returning()
      .get()
    db.insert(schema.drinkOptionValues)
      .values({ ownerId: 'alice', name: 'Oat', groupId: group.id })
      .run()
    db.delete(schema.drinkOptionGroups)
      .where(eq(schema.drinkOptionGroups.id, group.id))
      .run()
    expect(db.select().from(schema.drinkOptionValues).all()).toEqual([])
  })

  test('binds a bag, coffee and image to the same owner', () => {
    const bean = db
      .insert(schema.beans)
      .values({ ownerId: 'alice', name: 'First' })
      .returning()
      .get()
    const otherBean = db
      .insert(schema.beans)
      .values({ ownerId: 'alice', name: 'Second' })
      .returning()
      .get()
    const purchase = db
      .insert(schema.beanPurchases)
      .values({ ownerId: 'alice', beanId: bean.id })
      .returning()
      .get()
    expect(() =>
      db
        .insert(schema.beanImages)
        .values({
          ownerId: 'alice',
          beanId: otherBean.id,
          beanPurchaseId: purchase.id,
          storagePath: 'users/alice/wrong.webp',
        })
        .run(),
    ).toThrow('FOREIGN KEY')
    expect(() =>
      db
        .insert(schema.beanImages)
        .values({
          ownerId: 'bob',
          beanId: bean.id,
          beanPurchaseId: purchase.id,
          storagePath: 'users/bob/wrong.webp',
        })
        .run(),
    ).toThrow('FOREIGN KEY')
    db.insert(schema.beanImages)
      .values({
        ownerId: 'alice',
        beanId: bean.id,
        beanPurchaseId: purchase.id,
        storagePath: 'users/alice/correct.webp',
      })
      .run()
    db.delete(schema.beanPurchases)
      .where(eq(schema.beanPurchases.id, purchase.id))
      .run()
    expect(db.select().from(schema.beanImages).all()).toEqual([])
  })

  test('owner-aware relation joins hide a corrupt cross-owner reference', () => {
    const roaster = db
      .insert(schema.roasters)
      .values({ ownerId: 'alice', name: 'Alice secret' })
      .returning()
      .get()
    const bean = db
      .insert(schema.beans)
      .values({ ownerId: 'bob', name: 'Bob coffee' })
      .returning()
      .get()
    // Simulate a preexisting corrupt row to verify read-side isolation as well.
    sqlite.exec('PRAGMA foreign_keys = OFF')
    sqlite
      .query('update beans set roaster_id = ? where id = ?')
      .run(roaster.id, bean.id)
    sqlite.exec('PRAGMA foreign_keys = ON')
    expect(
      db.query.beans
        .findFirst({
          where: eq(schema.beans.id, bean.id),
          with: { roasterRef: true },
        })
        .sync(),
    ).toMatchObject({ ownerId: 'bob', roasterRef: null })
    expect(
      db.query.roasters
        .findFirst({
          where: eq(schema.roasters.id, roaster.id),
          with: { beans: true },
        })
        .sync(),
    ).toMatchObject({ ownerId: 'alice', beans: [] })
  })

  test('roundtrips exact money, arrays, JSON, booleans and millisecond dates', () => {
    const when = new Date('2026-11-02T12:34:56.789Z')
    const bean = db
      .insert(schema.beans)
      .values({ ownerId: 'alice', name: 'Coffee' })
      .returning()
      .get()
    const purchase = db
      .insert(schema.beanPurchases)
      .values({
        ownerId: 'alice',
        beanId: bean.id,
        price: '19.995',
        initialWeightGrams: '2.5e2',
        purchasedAt: when,
      })
      .returning()
      .get()
    expect(purchase.price).toBe('20.00')
    expect(purchase.initialWeightGrams).toBe('250.00')
    expect(purchase.purchasedAt).toEqual(when)
    expect(purchase.isArchived).toBe(false)
    expect(purchase.createdAt.getTime()).toBeGreaterThan(Date.now() - 5000)
    const cost = '12345678.1234567890'
    const usage = db
      .insert(schema.aiUsage)
      .values({
        ownerId: 'alice',
        requestId: 'exact',
        feature: 'scan',
        model: 'test',
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: cost,
      })
      .returning()
      .get()
    expect(usage.estimatedCostUsd).toBe(cost)
    expect(
      sqlite.query('select estimated_cost_usd from ai_usage').get(),
    ).toEqual({ estimated_cost_usd: cost })
    const settings = db
      .insert(schema.settings)
      .values({ ownerId: 'alice' })
      .returning()
      .get()
    expect(settings.tasteProfileFields).toContain('overallRating')
    const payload = { nested: ['text', 2, true, null], value: { coffee: '☕' } }
    const event = db
      .insert(schema.aiRequestLogs)
      .values({
        ownerId: 'alice',
        requestType: 'brews',
        model: 'one',
        requestPayload: payload,
      })
      .returning()
      .get()
    expect(event.requestPayload).toEqual(payload)
  })

  test('rejects invalid enum, boolean, decimal, JSON and enum-array storage', () => {
    const bean = db
      .insert(schema.beans)
      .values({ ownerId: 'alice', name: 'Coffee' })
      .returning()
      .get()
    expect(() =>
      sqlite
        .query('update beans set type = ? where id = ?')
        .run('unknown', bean.id),
    ).toThrow('CHECK')
    expect(() =>
      sqlite
        .query('update beans set is_decaf = ? where id = ?')
        .run(2, bean.id),
    ).toThrow('CHECK')
    const purchase = db
      .insert(schema.beanPurchases)
      .values({ ownerId: 'alice', beanId: bean.id })
      .returning()
      .get()
    for (const price of ['garbage', '1.2.3', '1.999', '1000000.00', '-0.01']) {
      expect(() =>
        sqlite
          .query('update bean_purchases set price = ? where id = ?')
          .run(price, purchase.id),
      ).toThrow('CHECK')
    }
    db.insert(schema.settings).values({ ownerId: 'alice' }).run()
    for (const value of ['not json', '{}', 'null', '1']) {
      expect(() =>
        sqlite.query('update settings set taste_profile_fields = ?').run(value),
      ).toThrow()
    }
    const machine = db
      .insert(schema.gear)
      .values({ ownerId: 'alice', name: 'Machine', type: 'espresso_machine' })
      .returning()
      .get()
    db.insert(schema.espressoMachineDetails)
      .values({ ownerId: 'alice', gearId: machine.id })
      .run()
    for (const value of [
      '["unknown"]',
      '[1]',
      '[["manual"]]',
      '["manual",null]',
    ]) {
      expect(() =>
        sqlite
          .query('update espresso_machine_details set shot_stop_modes = ?')
          .run(value),
      ).toThrow()
    }
    sqlite
      .query('update espresso_machine_details set shot_stop_modes = ?')
      .run('["manual","weight"]')
    expect(
      db.select().from(schema.espressoMachineDetails).get()?.shotStopModes,
    ).toEqual(['manual', 'weight'])
  })

  test('rejects unknown admin roles and cascades account allowances', () => {
    expect(() =>
      sqlite.exec("update auth_users set role = 'superadmin'"),
    ).toThrow('CHECK')
    db.insert(schema.aiWeeklyUsage)
      .values({
        userId: 'alice',
        weekStart: new Date('2026-11-02T00:00:00Z'),
        requests: 1,
      })
      .run()
    db.delete(schema.authUsers).where(eq(schema.authUsers.id, 'alice')).run()
    expect(db.select().from(schema.aiWeeklyUsage).all()).toEqual([])
  })

  test('guards every owned table against missing or deleting owners', () => {
    for (const table of Object.values(schema)) {
      if (!is(table, SQLiteTable) || !('ownerId' in getTableColumns(table)))
        continue
      for (const action of ['insert', 'update']) {
        const triggerName = `${getTableName(table)}_active_owner_${action}`
        expect(
          sqlite
            .query('select name from sqlite_master where type = ? and name = ?')
            .get('trigger', triggerName),
        ).toEqual({ name: triggerName })
      }
    }
    expect(() =>
      db
        .insert(schema.beans)
        .values({ ownerId: 'missing', name: 'Unowned' })
        .run(),
    ).toThrow('Journal owner is unavailable')
    const bean = db
      .insert(schema.beans)
      .values({ ownerId: 'alice', name: 'Existing' })
      .returning()
      .get()
    db.update(schema.authUsers)
      .set({ deletingAt: new Date() })
      .where(eq(schema.authUsers.id, 'alice'))
      .run()
    expect(() =>
      db
        .insert(schema.beans)
        .values({ ownerId: 'alice', name: 'Too late' })
        .run(),
    ).toThrow('Journal owner is unavailable')
    expect(() =>
      db
        .update(schema.beans)
        .set({ name: 'Too late' })
        .where(eq(schema.beans.id, bean.id))
        .run(),
    ).toThrow('Journal owner is unavailable')
    db.delete(schema.beans).where(eq(schema.beans.id, bean.id)).run()
    expect(db.select().from(schema.beans).all()).toEqual([])
  })

  test('raw SQL string arrays reject non-string elements on inserts and updates', () => {
    for (const value of [
      '[1]',
      '[true]',
      '[null]',
      '[["text"]]',
      '[{"a":"text"}]',
    ]) {
      expect(() =>
        sqlite
          .query(`insert into brewing_methods
        (owner_id, name, enabled_parameters) values ('alice', 'Invalid', ?)`)
          .run(value),
      ).toThrow('Array elements must be strings')
    }
    db.insert(schema.brewingMethods)
      .values({
        ownerId: 'alice',
        name: 'Valid',
        enabledParameters: ['doseGrams'],
      })
      .run()
    expect(() =>
      sqlite
        .query('update brewing_methods set enabled_parameters = ?')
        .run('["doseGrams",1]'),
    ).toThrow('Array elements must be strings')
    db.insert(schema.settings).values({ ownerId: 'alice' }).run()
    expect(() =>
      sqlite
        .query('update settings set taste_profile_fields = ?')
        .run('[false]'),
    ).toThrow('Array elements must be strings')
    expect(() =>
      sqlite
        .query(`insert into oauth_client
      (id, client_id, redirect_uris) values ('client', 'client', ?)`)
        .run('["https://example.com",4]'),
    ).toThrow('Array elements must be strings')
  })

  test('never reuses a deleted autoincrement identifier', () => {
    const event = db
      .insert(schema.aiRequestLogs)
      .values({
        ownerId: 'alice',
        requestType: 'brews',
        model: 'one',
        requestPayload: {},
      })
      .returning()
      .get()
    db.delete(schema.aiRequestLogs).run()
    const next = db
      .insert(schema.aiRequestLogs)
      .values({
        ownerId: 'alice',
        requestType: 'brews',
        model: 'two',
        requestPayload: {},
      })
      .returning()
      .get()
    expect(next.id).toBeGreaterThan(event.id)
  })

  test('accepts Better Auth serialized arrays and JSON without changing journal strings', () => {
    const scopes = ['journal:read', 'journal:write']
    const metadata = {
      website: 'https://example.com',
      nested: { enabled: true },
    }
    db.run(sql`insert into ${schema.oauthResource} (id, identifier, name, allowed_scopes, metadata)
      values ('resource', 'https://app.example.com/mcp', 'Journal',
        ${sql.param(JSON.stringify(scopes), schema.oauthResource.allowedScopes)},
        ${sql.param(JSON.stringify(metadata), schema.oauthResource.metadata)})`)
    expect(db.select().from(schema.oauthResource).get()).toMatchObject({
      allowedScopes: scopes,
      metadata,
    })
    expect(() =>
      db.run(sql`update ${schema.oauthResource}
      set allowed_scopes = ${sql.param('[1]', schema.oauthResource.allowedScopes)}`),
    ).toThrow()
    const journalString = JSON.stringify(metadata)
    const event = db
      .insert(schema.aiRequestLogs)
      .values({
        ownerId: 'alice',
        requestType: 'test',
        model: 'string',
        requestPayload: journalString,
      })
      .returning()
      .get()
    expect(event.requestPayload).toBe(journalString)
  })

  test('fails a batch assertion and rolls back preceding writes', () => {
    expect(() =>
      sqlite.transaction(() => {
        db.insert(schema.beans)
          .values({ ownerId: 'alice', name: 'Rolled back' })
          .run()
        sqlite.exec(`insert into journal_mutation_assertions
        (id, expected_changes, actual_changes) values ('cas', 2, changes())`)
      })(),
    ).toThrow('CHECK')
    expect(db.select().from(schema.beans).all()).toEqual([])
    expect(db.select().from(schema.journalMutationAssertions).all()).toEqual([])
    expect(() =>
      db
        .insert(schema.journalIdCounters)
        .values({ tableName: 'beans', value: -1 })
        .run(),
    ).toThrow('CHECK')
  })
})

describe('D1 decimal normalization', () => {
  test.each([
    ['19.995', 8, 2, '20.00'],
    ['-19.995', 8, 2, '-20.00'],
    ['-0.004', 8, 2, '0.00'],
    ['+00012.345', 8, 2, '12.35'],
    ['1e-10', 18, 10, '0.0000000001'],
    ['1.2345e3', 8, 2, '1234.50'],
    ['0.99', 2, 2, '0.99'],
    ['2.5', 2, 0, '3'],
  ])('normalizes %s exactly', (input, precision, scale, expected) => {
    expect(normalizeDecimal(input, precision, scale)).toBe(expected)
  })

  test.each(['NaN', 'Infinity', '1.2.3', '999999.995', '1e129', '1e999999999'])(
    'rejects invalid or overflowing %s',
    (input) => {
      expect(() => normalizeDecimal(input, 8, 2)).toThrow()
    },
  )
})
