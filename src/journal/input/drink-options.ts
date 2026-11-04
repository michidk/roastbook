import { z } from 'zod'
import { nameSchema, positiveIdSchema } from '@/lib/server-validation'

const drinkTypeWriteSchema = z.object({
  id: positiveIdSchema.optional(),
  name: nameSchema,
  optionGroupIds: z.array(positiveIdSchema).max(20).default([]),
})

const optionValueWriteSchema = z.object({
  groupId: positiveIdSchema,
  name: nameSchema,
})

export { drinkTypeWriteSchema, optionValueWriteSchema }
