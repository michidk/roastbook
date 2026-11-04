import { z } from 'zod'
import {
  nameSchema,
  notesSchema,
  optionalNullableRatingSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'

type CoordinateInput = string | number | null | undefined

const coordinateInputSchema = z
  .union([z.number().finite(), z.string().trim().max(32)])
  .optional()

const coffeeShopCreateSchema = z.object({
  name: nameSchema,
  address: shortTextSchema.optional(),
  city: shortTextSchema.optional(),
  country: shortTextSchema.optional(),
  latitude: coordinateInputSchema,
  longitude: coordinateInputSchema,
  website: optionalUrlSchema,
  instagramHandle: z.string().trim().max(100).optional(),
  notes: notesSchema.optional(),
})

const coffeeShopUpdateSchema = coffeeShopCreateSchema.partial().extend({
  id: positiveIdSchema,
  address: shortTextSchema.nullable().optional(),
  city: shortTextSchema.nullable().optional(),
  country: shortTextSchema.nullable().optional(),
  latitude: coordinateInputSchema.nullable(),
  longitude: coordinateInputSchema.nullable(),
  website: z.url().max(2_048).nullable().optional(),
  instagramHandle: z.string().trim().max(100).nullable().optional(),
  notes: notesSchema.nullable().optional(),
  rating: optionalNullableRatingSchema,
  isFavorite: z.boolean().optional(),
  wantsToVisit: z.boolean().optional(),
})

const coffeeShopListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  list: z.enum(['all', 'favorites', 'want-to-visit']).default('all'),
})

function normalizeCoordinate(
  value: CoordinateInput,
  field: 'latitude' | 'longitude',
) {
  if (value === undefined || value === null || value === '') {
    return value === null ? null : undefined
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid ${field}`)
  }

  const [min, max] = field === 'latitude' ? [-90, 90] : [-180, 180]

  if (numericValue < min || numericValue > max) {
    throw new Error(`${field} must be between ${min} and ${max}`)
  }

  return String(numericValue)
}

function normalizeCoffeeShopInput<
  T extends { latitude?: CoordinateInput; longitude?: CoordinateInput },
>(data: T) {
  return {
    ...data,
    latitude: normalizeCoordinate(data.latitude, 'latitude'),
    longitude: normalizeCoordinate(data.longitude, 'longitude'),
  }
}

export {
  coffeeShopCreateSchema,
  coffeeShopListSchema,
  coffeeShopUpdateSchema,
  normalizeCoffeeShopInput,
}
