import { afterAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'

const connection = process.env.TEST_DATABASE_URL
const client = connection ? postgres(connection, { max: 4 }) : null
const suite = client ? describe : describe.skip
const a = `isolation-a-${randomUUID()}`,
  b = `isolation-b-${randomUUID()}`
async function asUser<T>(
  owner: string,
  work: (tx: postgres.TransactionSql) => Promise<T>,
) {
  if (!client) throw new Error('TEST_DATABASE_URL is required')
  return client.begin(async (tx) => {
    await tx`select set_config('roastbook.user_id',${owner},true)`
    await tx`set local role roastbook_journal`
    return work(tx)
  })
}
afterAll(async () => {
  if (client) {
    await client`delete from brews where owner_id in (${a},${b})`
    await client`delete from beans where owner_id in (${a},${b})`
    await client`delete from settings where owner_id in (${a},${b})`
    await client`delete from client_operations where owner_id in (${a},${b})`
    await client.end()
  }
})
suite('journal database boundary', () => {
  test('isolates concurrent reads, updates, joins and deletes through the restricted role', async () => {
    const rows = await Promise.all(
      [a, b].map((owner) =>
        asUser(
          owner,
          (tx) =>
            tx`insert into beans(name) values ('Private bean') returning id,owner_id`,
        ),
      ),
    )
    const rowA = required(required(rows[0])[0]),
      rowB = required(required(rows[1])[0])
    const idA = rowA.id,
      idB = rowB.id
    expect(rowA.owner_id).toBe(a)
    expect(rowB.owner_id).toBe(b)
    await asUser(a, async (tx) => {
      expect((await tx`select id from beans`).map((row) => row.id)).toEqual([
        idA,
      ])
      expect(
        await tx`update beans set name='Stolen' where id=${idB} returning id`,
      ).toHaveLength(0)
      expect(
        await tx`delete from beans where id=${idB} returning id`,
      ).toHaveLength(0)
      expect(
        await tx`select b.id from beans b join beans other on other.id=${idB}`,
      ).toHaveLength(0)
    })
    await expect(
      asUser(
        a,
        (tx) => tx`insert into beans(name,owner_id) values ('Spoof',${b})`,
      ),
    ).rejects.toThrow()
  })
  test('rejects a foreign key to another user even when the numeric ID exists', async () => {
    const [bean] = await asUser(b, (tx) => tx`select id from beans limit 1`)
    const [method] = await asUser(
      a,
      (tx) =>
        tx`insert into brewing_methods(name) values ('Ownership test') returning id`,
    )
    if (!bean || !method) throw new Error('Missing test fixture')
    try {
      await expect(
        asUser(
          a,
          (tx) =>
            tx`insert into brews(bean_id,brewing_method_id) values (${bean.id},${method.id})`,
        ),
      ).rejects.toThrow()
    } finally {
      await required(client)`delete from brewing_methods where id=${method.id}`
    }
  })
  test('allows private singleton preferences and repeated operation IDs for different users', async () => {
    for (const owner of [a, b])
      await asUser(owner, async (tx) => {
        await tx`insert into settings(id,default_currency) values (1,${owner === a ? 'EUR' : 'USD'}) on conflict(owner_id,id) do update set default_currency=excluded.default_currency`
        await tx`insert into client_operations(operation_id) values ('same-operation') on conflict(owner_id,operation_id) do nothing`
      })
    expect(
      required(
        (await asUser(a, (tx) => tx`select default_currency from settings`))[0],
      ).default_currency,
    ).toBe('EUR')
    expect(
      required(
        (await asUser(b, (tx) => tx`select default_currency from settings`))[0],
      ).default_currency,
    ).toBe('USD')
  })
  test('has no auth table access and exposes no journal rows without an owner', async () => {
    await expect(
      asUser(a, (tx) => tx`select * from auth_users`),
    ).rejects.toThrow()
    const rows = await required(client).begin(async (tx) => {
      await tx`set local role roastbook_journal`
      return tx`select id from beans`
    })
    expect(rows).toHaveLength(0)
  })
})

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Missing test fixture')
  return value
}
