import * as remote from '@/lib/server/gear-sets'
import { journalFunction } from '../journal-function'
export const getGearSets = journalFunction(
  remote.getGearSets,
  'gear-sets/getGearSets',
  false,
)
export const getGearSetPage = journalFunction(
  remote.getGearSetPage,
  'gear-sets/getGearSetPage',
  false,
)
export const getGearSetById = journalFunction(
  remote.getGearSetById,
  'gear-sets/getGearSetById',
  false,
)
export const createGearSet = journalFunction(
  remote.createGearSet,
  'gear-sets/createGearSet',
  true,
)
export const updateGearSet = journalFunction(
  remote.updateGearSet,
  'gear-sets/updateGearSet',
  true,
)
export const deleteGearSet = journalFunction(
  remote.deleteGearSet,
  'gear-sets/deleteGearSet',
  true,
)
