import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { brewingMethods, shots } from '@/db/schema'
import {
  createShotOperation,
  updateShotOperation,
} from '@/lib/server/shots-operations.server'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip
let brewingMethodId: number | undefined

integrationDescribe('brew operations contract', () => {
  beforeAll(async () => {
    const [method] = await db
      .insert(brewingMethods)
      .values({
        name: `contract-method-${crypto.randomUUID()}`,
        enabledParameters: ['doseGrams', 'yieldGrams'],
      })
      .returning({ id: brewingMethods.id })
    brewingMethodId = method?.id
  })

  afterAll(async () => {
    if (!brewingMethodId) return
    await db.delete(shots).where(eq(shots.brewingMethodId, brewingMethodId))
    await db
      .delete(brewingMethods)
      .where(eq(brewingMethods.id, brewingMethodId))
  })

  test('creates and updates a brew atomically through the domain boundary', async () => {
    if (!brewingMethodId)
      throw new Error('Contract brewing method was not created')

    const created = await createShotOperation({
      brewingMethodId,
      doseGrams: '18.0',
      yieldGrams: '36.0',
      brewPressureBar: '9.0',
      notes: 'Initial contract brew',
    })

    expect(created).toMatchObject({
      brewingMethodId,
      doseGrams: '18.000000',
      yieldGrams: '36.000000',
      brewPressureBar: null,
      notes: 'Initial contract brew',
    })

    const updated = await updateShotOperation({
      id: created.id,
      brewingMethodId,
      doseGrams: '19.0',
      yieldGrams: '38.0',
      notes: 'Updated contract brew',
    })

    expect(updated).toMatchObject({
      id: created.id,
      doseGrams: '19.000000',
      yieldGrams: '38.000000',
      notes: 'Updated contract brew',
    })
  })

  test('rejects a brew whose brewing method does not exist', async () => {
    await expect(
      createShotOperation({ brewingMethodId: 2_147_483_647 }),
    ).rejects.toThrow('Brewing method not found')
  })
})
