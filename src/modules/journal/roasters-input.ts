import { z } from 'zod'
import {
  nameSchema,
  notesSchema,
  optionalUrlSchema,
  positiveIdSchema,
  shortTextSchema,
} from '@/lib/server-validation'

const roasterCreateSchema = z.object({
  name: nameSchema,
  location: shortTextSchema.optional(),
  country: shortTextSchema.optional(),
  website: optionalUrlSchema,
  instagramHandle: z.string().trim().max(100).optional(),
  notes: notesSchema.optional(),
})

const roasterUpdateSchema = roasterCreateSchema.partial().extend({
  id: positiveIdSchema,
  location: shortTextSchema.nullable().optional(),
  country: shortTextSchema.nullable().optional(),
  website: z
    .union([z.url().max(2_048), z.literal('')])
    .nullable()
    .optional(),
  instagramHandle: z.string().trim().max(100).nullable().optional(),
  notes: notesSchema.nullable().optional(),
})

const roasterListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['name', 'location', 'beans']).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

export { roasterCreateSchema, roasterListSchema, roasterUpdateSchema }
