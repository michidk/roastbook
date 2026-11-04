import * as remote from '@/lib/server/roasters'
import { integrationCapability } from '../integration-capability'
import { journalRead, journalWrite } from '../journal-function'
export const getRoasters = journalRead(
  remote.getRoasters,
  'roasters/getRoasters',
)
export const getRoasterPage = journalRead(
  remote.getRoasterPage,
  'roasters/getRoasterPage',
)
export const getRoaster = journalRead(remote.getRoaster, 'roasters/getRoaster')
export const createRoaster = journalWrite(
  remote.createRoaster,
  'roasters/createRoaster',
)
export const updateRoaster = journalWrite(
  remote.updateRoaster,
  'roasters/updateRoaster',
)
export const deleteRoaster = journalWrite(
  remote.deleteRoaster,
  'roasters/deleteRoaster',
)
export { researchRoasterInfo } from '@/lib/server/roasters'

export const checkRoasterResearchEnabled = integrationCapability(() =>
  remote.checkRoasterResearchEnabled(),
)
