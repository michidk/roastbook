import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  createShotAndSaveRecipeSchema,
  relatedShotListSchema,
  shotGroupListSchema,
  shotListSchema,
} from '@/lib/server/shot-list-contract.server'
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
