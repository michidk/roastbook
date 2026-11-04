import { nameSchema, shotUpdateSchema } from '@/lib/server-validation'

export const recipeUpdateSchema = shotUpdateSchema
  .omit({
    brewedAt: true,
    rating: true,
    bitterness: true,
    acidity: true,
    sweetness: true,
    body: true,
    astringency: true,
    notes: true,
    tasteTagIds: true,
  })
  .extend({ name: nameSchema })
export const recipeCreateSchema = recipeUpdateSchema.omit({
  id: true,
  baseUpdatedAt: true,
})
