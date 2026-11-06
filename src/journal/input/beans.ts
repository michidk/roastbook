import { z } from 'zod'
import { BEAN_TYPE_VALUES, ROAST_LEVEL_VALUES } from '@/lib/domain-contracts'
import {
  currencySchema,
  decimalStringSchema,
  nameSchema,
  notesSchema,
  optionalNullableRatingSchema,
  optionalPositiveIdSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'

const beanTypeSchema = z.enum(BEAN_TYPE_VALUES)

const roastLevelSchema = z.enum(ROAST_LEVEL_VALUES)

const altitudeSchema = z.number().int().min(0).max(9_000)

function checkAltitudeRange(
  value: {
    readonly altitudeMinMeters?: number | null
    readonly altitudeMaxMeters?: number | null
  },
  context: z.RefinementCtx,
) {
  const { altitudeMinMeters: min, altitudeMaxMeters: max } = value
  if (min != null && max != null && min > max) {
    context.addIssue({
      code: 'custom',
      path: ['altitudeMaxMeters'],
      message: 'Maximum altitude must not be below the minimum.',
    })
  }
}

const beanCreateSchema = z.object({
  name: nameSchema,
  createBag: z.boolean().optional(),
  alwaysOnShelf: z.boolean().optional(),
  rating: optionalNullableRatingSchema,
  ratingNote: notesSchema.nullable().optional(),
  beanTagIds: z.array(positiveIdSchema).max(100).optional(),
  type: beanTypeSchema.optional(),
  isDecaf: z.boolean().optional(),
  roaster: shortTextSchema.optional(),
  roasterId: optionalPositiveIdSchema,
  origin: shortTextSchema.optional(),
  region: shortTextSchema.optional(),
  farm: shortTextSchema.optional(),
  variety: shortTextSchema.optional(),
  altitudeMinMeters: altitudeSchema.optional(),
  altitudeMaxMeters: altitudeSchema.optional(),
  process: shortTextSchema.optional(),
  roastLevel: roastLevelSchema.optional(),
  notes: notesSchema.optional(),
  roastDate: z.date().optional(),
  weight: decimalStringSchema.optional(),
  price: decimalStringSchema.optional(),
  priceCurrency: currencySchema.optional(),
  shopName: shortTextSchema.optional(),
  shopUrl: optionalUrlSchema,
  isArchived: z.boolean().optional(),
})

const beanUpdateSchema = beanCreateSchema.partial().extend({
  id: positiveIdSchema,
  type: beanTypeSchema.nullable().optional(),
  roaster: shortTextSchema.nullable().optional(),
  roasterId: positiveIdSchema.nullable().optional(),
  origin: shortTextSchema.nullable().optional(),
  region: shortTextSchema.nullable().optional(),
  farm: shortTextSchema.nullable().optional(),
  variety: shortTextSchema.nullable().optional(),
  altitudeMinMeters: altitudeSchema.nullable().optional(),
  altitudeMaxMeters: altitudeSchema.nullable().optional(),
  process: shortTextSchema.nullable().optional(),
  roastLevel: roastLevelSchema.nullable().optional(),
  notes: notesSchema.nullable().optional(),
})

const beanListSchema = z.object({
  activePage: z.number().int().min(1).max(100_000).default(1),
  archivedPage: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  tagId: positiveIdSchema.optional(),
})

export {
  altitudeSchema,
  beanCreateSchema,
  beanListSchema,
  beanTypeSchema,
  beanUpdateSchema,
  checkAltitudeRange,
  roastLevelSchema,
}
