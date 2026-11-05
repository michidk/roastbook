import { z } from 'zod'
import {
  archiveBeanPurchaseOperation,
  createBeanPurchaseOperation,
  updateBeanPurchaseOperation,
} from '@/journal/domain/bean-purchases'
import { journalWrite } from '@/journal/function'
import { beanPurchaseValuesSchema } from '@/lib/bean-purchase-input'
import { positiveIdSchema } from '@/lib/server-validation'

export const beanPurchaseCreateSchema = beanPurchaseValuesSchema.extend({
  beanId: positiveIdSchema,
})
export const beanPurchaseArchiveSchema = z.object({
  id: positiveIdSchema,
  beanId: positiveIdSchema,
  isArchived: z.boolean(),
})
export const beanPurchaseUpdateSchema = beanPurchaseValuesSchema
  .omit({ isArchived: true })
  .extend({ id: positiveIdSchema, beanId: positiveIdSchema })

export const createBeanPurchase = journalWrite(
  'bean-purchases/createBeanPurchase',
)
  .validator(beanPurchaseCreateSchema)
  .handler(({ data }) => {
    const { beanId, ...values } = data
    return createBeanPurchaseOperation(beanId, values)
  })

export const setBeanPurchaseArchived = journalWrite(
  'bean-purchases/setBeanPurchaseArchived',
)
  .validator(beanPurchaseArchiveSchema)
  .handler(({ data }) =>
    archiveBeanPurchaseOperation(data.id, data.beanId, data.isArchived),
  )

export const updateBeanPurchase = journalWrite(
  'bean-purchases/updateBeanPurchase',
)
  .validator(beanPurchaseUpdateSchema)
  .handler(({ data }) => {
    const { id, beanId, ...values } = data
    return updateBeanPurchaseOperation(id, beanId, values)
  })
