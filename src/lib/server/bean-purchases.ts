import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  archiveBeanPurchaseOperation,
  createBeanPurchaseOperation,
  updateBeanPurchaseOperation,
} from '@/lib/server/bean-purchases.server'
import {
  currencySchema,
  decimalStringSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'

export const beanPurchaseValuesSchema = z.object({
  purchasedAt: z.date().nullable().optional(),
  roastDate: z.date().nullable().optional(),
  initialWeightGrams: decimalStringSchema.nullable().optional(),
  price: decimalStringSchema.nullable().optional(),
  priceCurrency: currencySchema.nullable().optional(),
  shopName: shortTextSchema.nullable().optional(),
  shopUrl: optionalUrlSchema.nullable().optional(),
  isArchived: z.boolean().optional(),
})

const createSchema = beanPurchaseValuesSchema.extend({
  beanId: positiveIdSchema,
})
const archiveSchema = z.object({
  id: positiveIdSchema,
  beanId: positiveIdSchema,
  isArchived: z.boolean(),
})

export const createBeanPurchase = createServerFn({ method: 'POST' })
  .validator(createSchema)
  .handler(({ data }) => {
    const { beanId, ...values } = data
    return createBeanPurchaseOperation(beanId, values)
  })

export const setBeanPurchaseArchived = createServerFn({ method: 'POST' })
  .validator(archiveSchema)
  .handler(({ data }) =>
    archiveBeanPurchaseOperation(data.id, data.beanId, data.isArchived),
  )

export const updateBeanPurchase = createServerFn({ method: 'POST' })
  .validator(
    beanPurchaseValuesSchema
      .omit({ isArchived: true })
      .extend({ id: positiveIdSchema, beanId: positiveIdSchema }),
  )
  .handler(({ data }) => {
    const { id, beanId, ...values } = data
    return updateBeanPurchaseOperation(id, beanId, values)
  })
