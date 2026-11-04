import { z } from 'zod'
import {
  archiveBeanPurchaseOperation,
  createBeanPurchaseOperation,
  updateBeanPurchaseOperation,
} from '@/journal/domain/bean-purchases'
import { journalWrite } from '@/journal/function'
import { beanPurchaseValuesSchema } from '@/lib/bean-purchase-input'
import { positiveIdSchema } from '@/lib/server-validation'

const createSchema = beanPurchaseValuesSchema.extend({
  beanId: positiveIdSchema,
})
const archiveSchema = z.object({
  id: positiveIdSchema,
  beanId: positiveIdSchema,
  isArchived: z.boolean(),
})

export const createBeanPurchase = journalWrite(
  'bean-purchases/createBeanPurchase',
)
  .validator(createSchema)
  .handler(({ data }) => {
    const { beanId, ...values } = data
    return createBeanPurchaseOperation(beanId, values)
  })

export const setBeanPurchaseArchived = journalWrite(
  'bean-purchases/setBeanPurchaseArchived',
)
  .validator(archiveSchema)
  .handler(({ data }) =>
    archiveBeanPurchaseOperation(data.id, data.beanId, data.isArchived),
  )

export const updateBeanPurchase = journalWrite(
  'bean-purchases/updateBeanPurchase',
)
  .validator(
    beanPurchaseValuesSchema
      .omit({ isArchived: true })
      .extend({ id: positiveIdSchema, beanId: positiveIdSchema }),
  )
  .handler(({ data }) => {
    const { id, beanId, ...values } = data
    return updateBeanPurchaseOperation(id, beanId, values)
  })
