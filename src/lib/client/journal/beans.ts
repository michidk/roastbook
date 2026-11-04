import * as remote from '@/lib/server/beans'
import { integrationCapability } from '../integration-capability'
import { journalFunction } from '../journal-function'
export const getBeans = journalFunction(
  remote.getBeans,
  'beans/getBeans',
  false,
)
export const getBeanCollection = journalFunction(
  remote.getBeanCollection,
  'beans/getBeanCollection',
  false,
)
export const getBean = journalFunction(remote.getBean, 'beans/getBean', false)
export const getActiveBeans = journalFunction(
  remote.getActiveBeans,
  'beans/getActiveBeans',
  false,
)
export const getActiveBeanPurchases = journalFunction(
  remote.getActiveBeanPurchases,
  'beans/getActiveBeanPurchases',
  false,
)
export const createBean = journalFunction(
  remote.createBean,
  'beans/createBean',
  true,
)
export const updateBean = journalFunction(
  remote.updateBean,
  'beans/updateBean',
  true,
)
export const deleteBean = journalFunction(
  remote.deleteBean,
  'beans/deleteBean',
  true,
)
export {
  extractBeanInfo,
  researchBeanInfo,
} from '@/lib/server/beans'

export const checkVisionEnabled = integrationCapability(() =>
  remote.checkVisionEnabled(),
)

export const checkResearchEnabled = integrationCapability(() =>
  remote.checkResearchEnabled(),
)
