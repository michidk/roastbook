import * as remote from '@/lib/server/gear-sets'
import { journalRead, journalWrite } from '../journal-function'
export const getGearSets = journalRead(
  remote.getGearSets,
  'gear-sets/getGearSets',
)
export const getGearSetPage = journalRead(
  remote.getGearSetPage,
  'gear-sets/getGearSetPage',
)
export const getGearSetById = journalRead(
  remote.getGearSetById,
  'gear-sets/getGearSetById',
)
export const createGearSet = journalWrite(
  remote.createGearSet,
  'gear-sets/createGearSet',
)
export const updateGearSet = journalWrite(
  remote.updateGearSet,
  'gear-sets/updateGearSet',
)
export const deleteGearSet = journalWrite(
  remote.deleteGearSet,
  'gear-sets/deleteGearSet',
)
