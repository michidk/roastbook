import * as remote from '@/lib/server/brewing-methods'
import { journalRead, journalWrite } from '../journal-function'
export const getBrewingMethods = journalRead(
  remote.getBrewingMethods,
  'brewing-methods/getBrewingMethods',
)
export const getBrewingMethodPage = journalRead(
  remote.getBrewingMethodPage,
  'brewing-methods/getBrewingMethodPage',
)
export const getBrewingMethod = journalRead(
  remote.getBrewingMethod,
  'brewing-methods/getBrewingMethod',
)
export const createBrewingMethod = journalWrite(
  remote.createBrewingMethod,
  'brewing-methods/createBrewingMethod',
)
export const updateBrewingMethod = journalWrite(
  remote.updateBrewingMethod,
  'brewing-methods/updateBrewingMethod',
)
export const deleteBrewingMethod = journalWrite(
  remote.deleteBrewingMethod,
  'brewing-methods/deleteBrewingMethod',
)
