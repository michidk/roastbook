import { z } from 'zod'
import { beanCreateSchema, checkAltitudeRange } from '@/journal/input/beans'
import { DECIMAL_CONSTRAINTS } from '@/lib/measurement-constraints'
import {
  boundedDecimalStringSchema,
  currencySchema,
  notesSchema,
  notFutureDateSchema,
  optionalNullablePositiveIdSchema,
  optionalNullableRatingSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

const cafeVisitSchema = z.object({
  coffeeShopId: optionalNullablePositiveIdSchema,
  beanId: optionalNullablePositiveIdSchema,
  drinkTypeId: optionalNullablePositiveIdSchema,
  drinkOptionValueIds: z.array(positiveIdSchema).max(20).optional(),
  price: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.cafeVisitPrice.maximum,
    DECIMAL_CONSTRAINTS.cafeVisitPrice.fractionDigits,
  ).optional(),
  currency: currencySchema.optional(),
  rating: optionalNullableRatingSchema,
  notes: notesSchema.optional(),
  visitedAt: notFutureDateSchema.optional(),
  tasteTagIds: z.array(positiveIdSchema).max(100).optional(),
})

const cafeVisitCreateSchema = cafeVisitSchema
  .extend({
    newBean: beanCreateSchema.superRefine(checkAltitudeRange).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.newBean && data.beanId)
      ctx.addIssue({
        code: 'custom',
        path: ['newBean'],
        message: 'Choose an existing coffee or create one.',
      })
  })

const cafeVisitUpdateSchema = cafeVisitSchema.partial().extend({
  id: positiveIdSchema,
  drinkTypeId: optionalNullablePositiveIdSchema,
  price: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.cafeVisitPrice.maximum,
    DECIMAL_CONSTRAINTS.cafeVisitPrice.fractionDigits,
  )
    .nullable()
    .optional(),
  currency: currencySchema.nullable().optional(),
  notes: notesSchema.nullable().optional(),
})

const cafeVisitListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})

export {
  cafeVisitCreateSchema,
  cafeVisitListSchema,
  cafeVisitSchema,
  cafeVisitUpdateSchema,
}
