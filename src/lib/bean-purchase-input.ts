import { z } from 'zod'
import {
  currencySchema,
  decimalStringSchema,
  optionalUrlSchema,
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
