import * as remote from '@/lib/server/drink-options'
import { journalFunction } from '../journal-function'
export const getDrinkConfiguration = journalFunction(
  remote.getDrinkConfiguration,
  'drink-options/getDrinkConfiguration',
  false,
)
export const saveDrinkType = journalFunction(
  remote.saveDrinkType,
  'drink-options/saveDrinkType',
  true,
)
export const archiveDrinkType = journalFunction(
  remote.archiveDrinkType,
  'drink-options/archiveDrinkType',
  true,
)
export const createDrinkOptionValue = journalFunction(
  remote.createDrinkOptionValue,
  'drink-options/createDrinkOptionValue',
  true,
)
export const archiveDrinkOptionValue = journalFunction(
  remote.archiveDrinkOptionValue,
  'drink-options/archiveDrinkOptionValue',
  true,
)
