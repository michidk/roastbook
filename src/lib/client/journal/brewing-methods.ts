import * as remote from '@/lib/server/brewing-methods'
import { journalFunction } from '../journal-function'
export const getBrewingMethods = journalFunction(
  remote.getBrewingMethods,
  'brewing-methods/getBrewingMethods',
  false,
)
export const getBrewingMethodPage = journalFunction(
  remote.getBrewingMethodPage,
  'brewing-methods/getBrewingMethodPage',
  false,
)
export const getBrewingMethod = journalFunction(
  remote.getBrewingMethod,
  'brewing-methods/getBrewingMethod',
  false,
)
export const createBrewingMethod = journalFunction(
  remote.createBrewingMethod,
  'brewing-methods/createBrewingMethod',
  true,
)
export const updateBrewingMethod = journalFunction(
  remote.updateBrewingMethod,
  'brewing-methods/updateBrewingMethod',
  true,
)
export const deleteBrewingMethod = journalFunction(
  remote.deleteBrewingMethod,
  'brewing-methods/deleteBrewingMethod',
  true,
)
