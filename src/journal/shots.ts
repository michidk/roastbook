import { z } from 'zod'
import {
  createShotAndSaveRecipeSchema,
  relatedShotListSchema,
  shotGroupListSchema,
  shotListSchema,
} from '@/journal/domain/shot-list-contract'
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
} from '@/journal/domain/shots-operations'
import { journalRead, journalWrite } from '@/journal/function'
import {
  deleteRecordSchema,
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

export const getShotPage = journalRead('shots/getShotPage')
  .validator(shotListSchema)
  .handler(({ data }) => getShotPageOperation(data))

export const getBeanShotPage = journalRead('shots/getBeanShotPage')
  .validator(relatedShotListSchema)
  .handler(({ data }) => getBeanShotPageOperation(data))

export const getGearShotPage = journalRead('shots/getGearShotPage')
  .validator(relatedShotListSchema)
  .handler(({ data }) => getGearShotPageOperation(data))

export const getBeanShotAnalytics = journalRead('shots/getBeanShotAnalytics')
  .validator(positiveIdSchema)
  .handler(({ data }) => getBeanShotAnalyticsOperation(data))

export const getShotGroups = journalRead('shots/getShotGroups')
  .validator(shotGroupListSchema)
  .handler(({ data }) => getShotGroupsOperation(data))

export const getShot = journalRead('shots/getShot')
  .validator(positiveIdSchema)
  .handler(({ data }) => getShotOperation(data))

export const createShot = journalWrite('shots/createShot')
  .validator(validateShotCreate)
  .handler(({ data }) => createShotOperation(data))

export const createShotAndSaveRecipe = journalWrite(
  'shots/createShotAndSaveRecipe',
)
  .validator((input: unknown) => {
    const data = createShotAndSaveRecipeSchema.parse(input)
    return { ...data, shot: validateShotCreate(data.shot) }
  })
  .handler(({ data }) => createShotAndSaveRecipeOperation(data))

export const updateShot = journalWrite('shots/updateShot')
  .validator((input: unknown) => {
    const data = shotUpdateSchema.parse(input)
    assertValidUpdate(getShotUpdateErrors(data))
    return data
  })
  .handler(({ data }) => updateShotOperation(data))

export const deleteShot = journalWrite('shots/deleteShot')
  .validator((input: unknown) => {
    const data = deleteRecordSchema.parse(input)
    return typeof data === 'number' ? { id: data } : data
  })
  .handler(({ data }) => deleteShotOperation(data))

export const getLastShotForBeanAndMethod = journalRead(
  'shots/getLastShotForBeanAndMethod',
)
  .validator(lastShotSchema)
  .handler(({ data }) => getLastShotForBeanAndMethodOperation(data))
