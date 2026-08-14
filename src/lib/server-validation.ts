import { z } from 'zod'
import { isDateTooFarInFuture } from '@/lib/date-input'
import {
  CURRENCY_VALUES,
  DISTRIBUTION_METHOD_VALUES,
  ENTITY_TYPE_VALUES,
  IMAGE_MIME_TYPE_VALUES,
  MAX_IMAGE_BYTES,
  PAPER_FILTER_POSITION_VALUES,
  RATIO_BASIS_VALUES,
  THUMBNAIL_ENTITY_TYPE_VALUES,
} from '@/lib/domain-contracts'
import { DECIMAL_CONSTRAINTS } from '@/lib/measurement-constraints'

export { MAX_IMAGE_BYTES }

const MAX_BASE64_IMAGE_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4

export const positiveIdSchema = z.number().int().positive()
export const optionalPositiveIdSchema = positiveIdSchema.optional()
export const nullablePositiveIdSchema = positiveIdSchema.nullable()
export const optionalNullablePositiveIdSchema =
  nullablePositiveIdSchema.optional()

export const ratingSchema = z.number().int().min(1).max(5)
export const optionalNullableRatingSchema = ratingSchema.nullable().optional()
export const notFutureDateSchema = z
  .date()
  .refine(
    (value) => !isDateTooFarInFuture(value),
    'Date cannot be more than five minutes in the future',
  )

export const shortTextSchema = z.string().trim().max(500)
export const nameSchema = z.string().trim().min(1).max(200)
export const notesSchema = z.string().trim().max(10_000)
const SUPPORTED_CURRENCIES = new Set<string>(CURRENCY_VALUES)
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

const SUPPORTED_IMAGE_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPE_VALUES)

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

export const entityTypeSchema = z.enum(ENTITY_TYPE_VALUES)

export const thumbnailEntityTypeSchema = z.enum(THUMBNAIL_ENTITY_TYPE_VALUES)

const nullableShotDecimal = boundedDecimalStringSchema(
  DECIMAL_CONSTRAINTS.preinfusionTimeSeconds.maximum,
  DECIMAL_CONSTRAINTS.preinfusionTimeSeconds.fractionDigits,
)
  .nullable()
  .optional()

export const shotCreateSchema = z.object({
  recipeId: optionalNullablePositiveIdSchema,
  brewingMethodId: positiveIdSchema,
  brewedAt: notFutureDateSchema.optional(),
  beanId: optionalNullablePositiveIdSchema,
  machineId: optionalNullablePositiveIdSchema,
  doseGrams: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.doseGrams.maximum,
    DECIMAL_CONSTRAINTS.doseGrams.fractionDigits,
  )
    .nullable()
    .optional(),
  brewWaterGrams: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.brewWaterGrams.maximum,
    DECIMAL_CONSTRAINTS.brewWaterGrams.fractionDigits,
  )
    .nullable()
    .optional(),
  ratioBasis: z.enum(RATIO_BASIS_VALUES).nullable().optional(),
  grinderId: optionalNullablePositiveIdSchema,
  grindSetting: shortTextSchema.nullable().optional(),
  yieldGrams: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.yieldGrams.maximum,
    DECIMAL_CONSTRAINTS.yieldGrams.fractionDigits,
  )
    .nullable()
    .optional(),
  shotTimeSeconds: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.shotTimeSeconds.maximum,
    DECIMAL_CONSTRAINTS.shotTimeSeconds.fractionDigits,
  )
    .nullable()
    .optional(),
  brewTemperatureCelsius: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.brewTemperatureCelsius.maximum,
    DECIMAL_CONSTRAINTS.brewTemperatureCelsius.fractionDigits,
  )
    .nullable()
    .optional(),
  preinfusionTimeSeconds: nullableShotDecimal,
  preinfusionPressureBar: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.preinfusionPressureBar.maximum,
    DECIMAL_CONSTRAINTS.preinfusionPressureBar.fractionDigits,
  )
    .nullable()
    .optional(),
  bloomTimeSeconds: nullableShotDecimal,
  brewPressureBar: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.brewPressureBar.maximum,
    DECIMAL_CONSTRAINTS.brewPressureBar.fractionDigits,
  )
    .nullable()
    .optional(),
  flowRateMlPerSecond: boundedDecimalStringSchema(
    DECIMAL_CONSTRAINTS.flowRateMlPerSecond.maximum,
    DECIMAL_CONSTRAINTS.flowRateMlPerSecond.fractionDigits,
  )
    .nullable()
    .optional(),
  basketId: optionalNullablePositiveIdSchema,
  usesPuckScreen: z.boolean().nullable().optional(),
  paperFilterPosition: z
    .enum(PAPER_FILTER_POSITION_VALUES)
    .nullable()
    .optional(),
  distributionMethod: z.enum(DISTRIBUTION_METHOD_VALUES).nullable().optional(),
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
