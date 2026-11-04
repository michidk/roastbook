import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { beanPurchases, beans, brewingMethods, shots } from '@/db/schema'
import { updateBeanPurchaseOperation } from '@/journal/domain/bean-purchases'
import { db } from '@/journal/platform/database'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip

integrationDescribe('editing an existing bag', () => {
  let beanId: number
  let otherBeanId: number
  let purchaseId: number
  let methodId: number
  let shotId: number

  beforeAll(async () => {
    const [bean, otherBean] = await db
      .insert(beans)
      .values([
        { name: `bag-edit-${crypto.randomUUID()}` },
        { name: `other-coffee-${crypto.randomUUID()}` },
      ])
      .returning()
    const [method] = await db
      .insert(brewingMethods)
      .values({ name: `bag-edit-${crypto.randomUUID()}` })
      .returning()
    if (!bean || !otherBean || !method)
      throw new Error('Missing coffee fixtures')
    beanId = bean.id
    otherBeanId = otherBean.id
    methodId = method.id
    const [purchase] = await db
      .insert(beanPurchases)
      .values({ beanId, isArchived: true, initialWeightGrams: '250' })
      .returning()
    if (!purchase) throw new Error('Missing bag fixture')
    purchaseId = purchase.id
    const [shot] = await db
      .insert(shots)
      .values({
        beanId,
        beanPurchaseId: purchaseId,
        brewingMethodId: methodId,
        doseGrams: '18',
      })
      .returning()
    if (!shot) throw new Error('Missing brew fixture')
    shotId = shot.id
  })

  afterAll(async () => {
    if (shotId) await db.delete(shots).where(eq(shots.id, shotId))
    if (purchaseId)
      await db.delete(beanPurchases).where(eq(beanPurchases.id, purchaseId))
    if (beanId) await db.delete(beans).where(eq(beans.id, beanId))
    if (otherBeanId) await db.delete(beans).where(eq(beans.id, otherBeanId))
    if (methodId)
      await db.delete(brewingMethods).where(eq(brewingMethods.id, methodId))
  })

  test('updates roast and purchase details without changing shelf state or brew links', async () => {
    const roastDate = new Date('2026-10-10T00:00:00Z')
    const updated = await updateBeanPurchaseOperation(purchaseId, beanId, {
      roastDate,
      initialWeightGrams: '500',
      price: '24.50',
      priceCurrency: 'EUR',
      shopName: 'Example Roasters',
      shopUrl: 'https://example.com/coffee',
    })
    expect(updated).toMatchObject({
      id: purchaseId,
      beanId,
      roastDate,
      initialWeightGrams: '500.00',
      price: '24.50',
      priceCurrency: 'EUR',
      shopName: 'Example Roasters',
      shopUrl: 'https://example.com/coffee',
      isArchived: true,
    })
    expect(
      await db.query.shots.findFirst({ where: eq(shots.id, shotId) }),
    ).toMatchObject({
      id: shotId,
      beanId,
      beanPurchaseId: purchaseId,
      doseGrams: '18.00',
    })
    expect(
      await db.query.beanPurchases.findMany({
        where: eq(beanPurchases.beanId, beanId),
      }),
    ).toHaveLength(1)
  })

  test('rejects editing a bag through a different coffee', async () => {
    await expect(
      updateBeanPurchaseOperation(purchaseId, otherBeanId, {
        initialWeightGrams: '100',
      }),
    ).rejects.toThrow()
    expect(
      await db.query.beanPurchases.findFirst({
        where: eq(beanPurchases.id, purchaseId),
      }),
    ).toMatchObject({ beanId, initialWeightGrams: '500.00' })
  })

  test('allows clearing optional bag details', async () => {
    expect(
      await updateBeanPurchaseOperation(purchaseId, beanId, {
        roastDate: null,
        price: null,
        shopName: null,
        shopUrl: null,
      }),
    ).toMatchObject({
      roastDate: null,
      price: null,
      shopName: null,
      shopUrl: null,
      isArchived: true,
    })
  })
})
