import { z } from 'zod'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_BASE64_IMAGE_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4

export const positiveIdSchema = z.number().int().positive()
export const optionalPositiveIdSchema = positiveIdSchema.optional()
export const nullablePositiveIdSchema = positiveIdSchema.nullable()
export const optionalNullablePositiveIdSchema =
  nullablePositiveIdSchema.optional()

export const ratingSchema = z.number().int().min(1).max(5)
export const optionalNullableRatingSchema = ratingSchema.nullable().optional()

export const shortTextSchema = z.string().trim().max(500)
export const nameSchema = z.string().trim().min(1).max(200)
export const notesSchema = z.string().trim().max(10_000)
const SUPPORTED_CURRENCIES = new Set(['EUR', 'USD', 'GBP', 'CHF'])
export const currencySchema = z
  .string()
  .refine(
    (value) => SUPPORTED_CURRENCIES.has(value),
    'Choose a supported currency',
  )

export const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/, 'Expected a non-negative decimal number')

export function boundedDecimalStringSchema(
  maximum: number,
  fractionDigits: number,
) {
  return decimalStringSchema.refine((value) => {
    const fraction = value.split('.')[1]
    return (
      Number(value) <= maximum &&
      (fraction === undefined || fraction.length <= fractionDigits)
    )
  }, `Expected a value between 0 and ${maximum} with at most ${fractionDigits} decimal places`)
}

export const optionalUrlSchema = z
  .union([z.url().max(2_048), z.literal('')])
  .optional()

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const imageMimeTypeSchema = z
  .string()
  .refine(
    (value) => SUPPORTED_IMAGE_MIME_TYPES.has(value),
    'Unsupported image type',
  )

export const imageBase64Schema = z
  .string()
  .min(1)
  .max(MAX_BASE64_IMAGE_LENGTH)
  .regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Expected base64-encoded image data')
  .refine((value) => value.length % 4 === 0, 'Expected valid base64 padding')

export const imageFilenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (value) =>
      !value.includes('/') && !value.includes('\\') && !value.includes('\0'),
    'Filename cannot contain path separators',
  )

export const entityTypeSchema = z.enum([
  'beans',
  'gear',
  'coffee-shops',
  'shots',
  'visits',
])

export const thumbnailEntityTypeSchema = z.enum(['beans', 'gear'])

const nullableShotDecimal = boundedDecimalStringSchema(99_999.99, 2)
  .nullable()
  .optional()

export const shotCreateSchema = z.object({
  recipeId: optionalNullablePositiveIdSchema,
  brewingMethodId: positiveIdSchema,
  beanId: optionalNullablePositiveIdSchema,
  machineId: optionalNullablePositiveIdSchema,
  doseGrams: boundedDecimalStringSchema(999.99, 2).nullable().optional(),
  brewWaterGrams: boundedDecimalStringSchema(99_999.99, 2)
    .nullable()
    .optional(),
  ratioBasis: z.enum(['target_yield', 'brew_water']).nullable().optional(),
  grinderId: optionalNullablePositiveIdSchema,
  grindSetting: shortTextSchema.nullable().optional(),
  yieldGrams: boundedDecimalStringSchema(999.99, 2).nullable().optional(),
  shotTimeSeconds: boundedDecimalStringSchema(9_999.99, 2)
    .nullable()
    .optional(),
  brewTemperatureCelsius: boundedDecimalStringSchema(999.9, 1)
    .nullable()
    .optional(),
  preinfusionTimeSeconds: nullableShotDecimal,
  preinfusionPressureBar: boundedDecimalStringSchema(99.99, 2)
    .nullable()
    .optional(),
  bloomTimeSeconds: nullableShotDecimal,
  brewPressureBar: boundedDecimalStringSchema(99.99, 2).nullable().optional(),
  flowRateMlPerSecond: boundedDecimalStringSchema(99.99, 2)
    .nullable()
    .optional(),
  basketId: optionalNullablePositiveIdSchema,
  usesPuckScreen: z.boolean().nullable().optional(),
  paperFilterPosition: z
    .enum(['none', 'top', 'bottom', 'both'])
    .nullable()
    .optional(),
  distributionMethod: shortTextSchema.nullable().optional(),
  tampForceKg: nullableShotDecimal,
  accessoryGearIds: z.array(positiveIdSchema).max(100).optional(),
  rating: optionalNullableRatingSchema,
  bitterness: optionalNullableRatingSchema,
  acidity: optionalNullableRatingSchema,
  sweetness: optionalNullableRatingSchema,
  body: optionalNullableRatingSchema,
  astringency: optionalNullableRatingSchema,
  notes: notesSchema.nullable().optional(),
  tasteTagIds: z.array(positiveIdSchema).max(100).optional(),
})

export const shotUpdateSchema = shotCreateSchema.extend({
  id: positiveIdSchema,
})

export const tasteTagCreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
})
