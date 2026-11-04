import * as remote from '@/lib/server/gear'
import { integrationCapability } from '../integration-capability'
import { journalRead, journalWrite } from '../journal-function'
export const getGear = journalRead(remote.getGear, 'gear/getGear')
export const getGearPage = journalRead(remote.getGearPage, 'gear/getGearPage')
export const getGearById = journalRead(remote.getGearById, 'gear/getGearById')
export const createGear = journalWrite(remote.createGear, 'gear/createGear')
export const updateGear = journalWrite(remote.updateGear, 'gear/updateGear')
export const deleteGear = journalWrite(remote.deleteGear, 'gear/deleteGear')
export { researchMachineSettings } from '@/lib/server/gear'

export const checkGearResearchEnabled = integrationCapability(() =>
  remote.checkGearResearchEnabled(),
)
