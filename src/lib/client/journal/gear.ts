import * as remote from '@/lib/server/gear'
import { integrationCapability } from '../integration-capability'
import { journalFunction } from '../journal-function'
export const getGear = journalFunction(remote.getGear, 'gear/getGear', false)
export const getGearPage = journalFunction(
  remote.getGearPage,
  'gear/getGearPage',
  false,
)
export const getGearById = journalFunction(
  remote.getGearById,
  'gear/getGearById',
  false,
)
export const createGear = journalFunction(
  remote.createGear,
  'gear/createGear',
  true,
)
export const updateGear = journalFunction(
  remote.updateGear,
  'gear/updateGear',
  true,
)
export const deleteGear = journalFunction(
  remote.deleteGear,
  'gear/deleteGear',
  true,
)
export { researchMachineSettings } from '@/lib/server/gear'

export const checkGearResearchEnabled = integrationCapability(() =>
  remote.checkGearResearchEnabled(),
)
