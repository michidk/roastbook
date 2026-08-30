import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { recipeTargetSchema } from '@/lib/recipe-target'
import {
  createShotAndSaveRecipeOperation,
  createShotOperation,
  deleteShotOperation,
  getBeanShotAnalyticsOperation,
  getBeanShotPageOperation,
  getGearShotPageOperation,
  getLastShotForBeanAndMethodOperation,
  getShotGroupsOperation,
  getShotOperation,
  getShotPageOperation,
  updateShotOperation,
} from '@/lib/server/shots-operations.server'
import {
  positiveIdSchema,
  shotCreateSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'
import { SHOT_SORT_VALUES } from '@/modules/brews/read-models'

const shotListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  sort: z.enum(SHOT_SORT_VALUES).default('date'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  methodId: positiveIdSchema.optional(),
  rating: z.number().int().min(0).max(5).optional(),
  beanId: z.number().int().min(0).max(100_000).optional(),
})

const relatedShotListSchema = shotListSchema.omit({ beanId: true }).extend({
  entityId: positiveIdSchema,
})

const shotGroupListSchema = shotListSchema.pick({
  page: true,
  methodId: true,
  rating: true,
})

const createShotAndSaveRecipeSchema = z.object({
  shot: shotCreateSchema,
  target: recipeTargetSchema,
})

const lastShotSchema = z.object({
  beanId: positiveIdSchema,
  brewingMethodId: positiveIdSchema,
})

function validateShotCreate(input: unknown) {
  const data = shotCreateSchema.parse(input)
  assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
  return data
}

export const getShotPage = createServerFn({ method: 'GET' })
  .validator(shotListSchema)
  .handler(({ data }) => getShotPageOperation(data))

export const getBeanShotPage = createServerFn({ method: 'GET' })
  .validator(relatedShotListSchema)
  .handler(({ data }) => getBeanShotPageOperation(data))

export const getGearShotPage = createServerFn({ method: 'GET' })
  .validator(relatedShotListSchema)
  .handler(({ data }) => getGearShotPageOperation(data))

export const getBeanShotAnalytics = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(({ data }) => getBeanShotAnalyticsOperation(data))

export const getShotGroups = createServerFn({ method: 'GET' })
  .validator(shotGroupListSchema)
  .handler(({ data }) => getShotGroupsOperation(data))

export const getShot = createServerFn({ method: 'GET' })
  .validator(positiveIdSchema)
  .handler(({ data }) => getShotOperation(data))

export const createShot = createServerFn({ method: 'POST' })
  .validator(validateShotCreate)
  .handler(({ data }) => createShotOperation(data))

export const createShotAndSaveRecipe = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = createShotAndSaveRecipeSchema.parse(input)
    return { ...data, shot: validateShotCreate(data.shot) }
  })
  .handler(({ data }) => createShotAndSaveRecipeOperation(data))

export const updateShot = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = shotUpdateSchema.parse(input)
    assertValidUpdate(getShotUpdateErrors(data))
    return data
  })
  .handler(({ data }) => updateShotOperation(data))

export const deleteShot = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(({ data }) => deleteShotOperation(data))

export const getLastShotForBeanAndMethod = createServerFn({ method: 'GET' })
  .validator(lastShotSchema)
  .handler(({ data }) => getLastShotForBeanAndMethodOperation(data))
