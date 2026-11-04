import * as remote from '@/lib/server/shots'
import { journalRead, journalWrite } from '../journal-function'
export const getShotPage = journalRead(remote.getShotPage, 'shots/getShotPage')
export const getBeanShotPage = journalRead(
  remote.getBeanShotPage,
  'shots/getBeanShotPage',
)
export const getGearShotPage = journalRead(
  remote.getGearShotPage,
  'shots/getGearShotPage',
)
export const getBeanShotAnalytics = journalRead(
  remote.getBeanShotAnalytics,
  'shots/getBeanShotAnalytics',
)
export const getShotGroups = journalRead(
  remote.getShotGroups,
  'shots/getShotGroups',
)
export const getShot = journalRead(remote.getShot, 'shots/getShot')
export const createShot = journalWrite(remote.createShot, 'shots/createShot')
export const createShotAndSaveRecipe = journalWrite(
  remote.createShotAndSaveRecipe,
  'shots/createShotAndSaveRecipe',
)
export const updateShot = journalWrite(remote.updateShot, 'shots/updateShot')
export const deleteShot = journalWrite(remote.deleteShot, 'shots/deleteShot')
export const getLastShotForBeanAndMethod = journalRead(
  remote.getLastShotForBeanAndMethod,
  'shots/getLastShotForBeanAndMethod',
)
