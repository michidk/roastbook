import * as remote from '@/lib/server/roasters'
import { integrationCapability } from '../integration-capability'
import { journalFunction } from '../journal-function'
export const getRoasters = journalFunction(
  remote.getRoasters,
  'roasters/getRoasters',
  false,
)
export const getRoasterPage = journalFunction(
  remote.getRoasterPage,
  'roasters/getRoasterPage',
  false,
)
export const getRoaster = journalFunction(
  remote.getRoaster,
  'roasters/getRoaster',
  false,
)
export const createRoaster = journalFunction(
  remote.createRoaster,
  'roasters/createRoaster',
  true,
)
export const updateRoaster = journalFunction(
  remote.updateRoaster,
  'roasters/updateRoaster',
  true,
)
export const deleteRoaster = journalFunction(
  remote.deleteRoaster,
  'roasters/deleteRoaster',
  true,
)
export { researchRoasterInfo } from '@/lib/server/roasters'

export const checkRoasterResearchEnabled = integrationCapability(() =>
  remote.checkRoasterResearchEnabled(),
)
