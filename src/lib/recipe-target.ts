import { z } from 'zod'
import { nameSchema, positiveIdSchema } from '@/lib/server-validation'

const recipeTargetFields = {
  recipeId: positiveIdSchema.optional(),
  name: nameSchema.optional(),
}

function hasExactlyOneTarget({
  recipeId,
  name,
}: {
  readonly recipeId?: number
  readonly name?: string
}) {
  return (recipeId === undefined) !== (name === undefined)
}

export const recipeTargetSchema = z
  .object(recipeTargetFields)
  .refine(hasExactlyOneTarget, 'Choose an existing recipe or name a new one')

export const shotRecipeTargetSchema = z
  .object({
    shotId: positiveIdSchema,
    ...recipeTargetFields,
  })
  .refine(hasExactlyOneTarget, 'Choose an existing recipe or name a new one')

export type RecipeTarget = z.infer<typeof recipeTargetSchema>
