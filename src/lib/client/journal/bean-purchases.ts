import * as remote from '@/lib/server/bean-purchases'
import { journalFunction } from '../journal-function'
export const createBeanPurchase = journalFunction(
  remote.createBeanPurchase,
  'bean-purchases/createBeanPurchase',
  true,
)
export const setBeanPurchaseArchived = journalFunction(
  remote.setBeanPurchaseArchived,
  'bean-purchases/setBeanPurchaseArchived',
  true,
)
export const updateBeanPurchase = journalFunction(
  remote.updateBeanPurchase,
  'bean-purchases/updateBeanPurchase',
  true,
)
