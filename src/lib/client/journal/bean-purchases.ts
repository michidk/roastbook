import * as remote from '@/lib/server/bean-purchases'
import { journalWrite } from '../journal-function'
export const createBeanPurchase = journalWrite(
  remote.createBeanPurchase,
  'bean-purchases/createBeanPurchase',
)
export const setBeanPurchaseArchived = journalWrite(
  remote.setBeanPurchaseArchived,
  'bean-purchases/setBeanPurchaseArchived',
)
export const updateBeanPurchase = journalWrite(
  remote.updateBeanPurchase,
  'bean-purchases/updateBeanPurchase',
)
