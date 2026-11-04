import * as remote from '@/lib/server/cafe-visits'
import { journalRead, journalWrite } from '../journal-function'
export const getCafeVisitPage = journalRead(
  remote.getCafeVisitPage,
  'cafe-visits/getCafeVisitPage',
)
export const getCafeVisit = journalRead(
  remote.getCafeVisit,
  'cafe-visits/getCafeVisit',
)
export const createCafeVisit = journalWrite(
  remote.createCafeVisit,
  'cafe-visits/createCafeVisit',
)
export const updateCafeVisit = journalWrite(
  remote.updateCafeVisit,
  'cafe-visits/updateCafeVisit',
)
export const deleteCafeVisit = journalWrite(
  remote.deleteCafeVisit,
  'cafe-visits/deleteCafeVisit',
)
