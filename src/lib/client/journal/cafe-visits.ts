import * as remote from '@/lib/server/cafe-visits'
import { journalFunction } from '../journal-function'
export const getCafeVisitPage = journalFunction(
  remote.getCafeVisitPage,
  'cafe-visits/getCafeVisitPage',
  false,
)
export const getCafeVisit = journalFunction(
  remote.getCafeVisit,
  'cafe-visits/getCafeVisit',
  false,
)
export const createCafeVisit = journalFunction(
  remote.createCafeVisit,
  'cafe-visits/createCafeVisit',
  true,
)
export const updateCafeVisit = journalFunction(
  remote.updateCafeVisit,
  'cafe-visits/updateCafeVisit',
  true,
)
export const deleteCafeVisit = journalFunction(
  remote.deleteCafeVisit,
  'cafe-visits/deleteCafeVisit',
  true,
)
