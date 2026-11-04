import { z } from 'zod'
import {
  nameSchema,
  notesSchema,
  nullablePositiveIdSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

const gearSetWriteSchema = z.object({
  name: nameSchema,
  description: notesSchema.nullable(),
  machineId: nullablePositiveIdSchema,
  grinderId: nullablePositiveIdSchema,
  basketId: nullablePositiveIdSchema,
  accessoryGearIds: z.array(positiveIdSchema).max(100),
})

const gearSetUpdateSchema = gearSetWriteSchema.extend({
  id: positiveIdSchema,
})

const gearSetListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['name', 'added']).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

export { gearSetListSchema, gearSetUpdateSchema, gearSetWriteSchema }
