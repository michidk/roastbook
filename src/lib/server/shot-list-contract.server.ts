import { z } from 'zod'
import { recipeTargetSchema } from '@/lib/recipe-target'
import { positiveIdSchema, shotCreateSchema } from '@/lib/server-validation'
import { SHOT_SORT_VALUES } from '@/modules/brews/read-models'

export const shotListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  sort: z.enum(SHOT_SORT_VALUES).default('date'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  methodId: positiveIdSchema.optional(),
  rating: z.number().int().min(0).max(5).optional(),
  beanId: z.number().int().min(0).max(100_000).optional(),
})

export const relatedShotListSchema = shotListSchema
  .omit({ beanId: true })
  .extend({ entityId: positiveIdSchema })

export const shotGroupListSchema = shotListSchema.pick({
  page: true,
  methodId: true,
  rating: true,
})

export const createShotAndSaveRecipeSchema = z.object({
  shot: shotCreateSchema,
  target: recipeTargetSchema,
})

export type ShotListInput = z.infer<typeof shotListSchema>
export type RelatedShotListInput = z.infer<typeof relatedShotListSchema>
export type ShotGroupListInput = z.infer<typeof shotGroupListSchema>
export type CreateShotAndSaveRecipeInput = z.infer<
  typeof createShotAndSaveRecipeSchema
>
