import * as remote from '@/lib/server/drink-options'
import { journalRead, journalWrite } from '../journal-function'
export const getDrinkConfiguration = journalRead(
  remote.getDrinkConfiguration,
  'drink-options/getDrinkConfiguration',
)
export const saveDrinkType = journalWrite(
  remote.saveDrinkType,
  'drink-options/saveDrinkType',
)
export const archiveDrinkType = journalWrite(
  remote.archiveDrinkType,
  'drink-options/archiveDrinkType',
)
export const createDrinkOptionValue = journalWrite(
  remote.createDrinkOptionValue,
  'drink-options/createDrinkOptionValue',
)
export const archiveDrinkOptionValue = journalWrite(
  remote.archiveDrinkOptionValue,
  'drink-options/archiveDrinkOptionValue',
)
