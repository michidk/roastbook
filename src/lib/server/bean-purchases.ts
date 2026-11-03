import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { beanPurchaseValuesSchema } from '@/lib/bean-purchase-input'
import {
  archiveBeanPurchaseOperation,
  createBeanPurchaseOperation,
  updateBeanPurchaseOperation,
} from '@/lib/server/bean-purchases.server'
import { positiveIdSchema } from '@/lib/server-validation'

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
