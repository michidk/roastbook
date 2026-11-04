import * as remote from '@/lib/server/shots'
import { journalFunction } from '../journal-function'
export const getShotPage = journalFunction(
  remote.getShotPage,
  'shots/getShotPage',
  false,
)
export const getBeanShotPage = journalFunction(
  remote.getBeanShotPage,
  'shots/getBeanShotPage',
  false,
)
export const getGearShotPage = journalFunction(
  remote.getGearShotPage,
  'shots/getGearShotPage',
  false,
)
export const getBeanShotAnalytics = journalFunction(
  remote.getBeanShotAnalytics,
  'shots/getBeanShotAnalytics',
  false,
)
export const getShotGroups = journalFunction(
  remote.getShotGroups,
  'shots/getShotGroups',
  false,
)
export const getShot = journalFunction(remote.getShot, 'shots/getShot', false)
export const createShot = journalFunction(
  remote.createShot,
  'shots/createShot',
  true,
)
export const createShotAndSaveRecipe = journalFunction(
  remote.createShotAndSaveRecipe,
  'shots/createShotAndSaveRecipe',
  true,
)
export const updateShot = journalFunction(
  remote.updateShot,
  'shots/updateShot',
  true,
)
export const deleteShot = journalFunction(
  remote.deleteShot,
  'shots/deleteShot',
  true,
)
export const getLastShotForBeanAndMethod = journalFunction(
  remote.getLastShotForBeanAndMethod,
  'shots/getLastShotForBeanAndMethod',
  false,
)
