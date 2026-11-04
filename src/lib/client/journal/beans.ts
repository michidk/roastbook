import * as remote from '@/lib/server/beans'
import { integrationCapability } from '../integration-capability'
import { journalRead, journalWrite } from '../journal-function'
export const getBeans = journalRead(remote.getBeans, 'beans/getBeans')
export const getBeanCollection = journalRead(
  remote.getBeanCollection,
  'beans/getBeanCollection',
)
export const getBean = journalRead(remote.getBean, 'beans/getBean')
export const getActiveBeans = journalRead(
  remote.getActiveBeans,
  'beans/getActiveBeans',
)
export const getActiveBeanPurchases = journalRead(
  remote.getActiveBeanPurchases,
  'beans/getActiveBeanPurchases',
)
export const createBean = journalWrite(remote.createBean, 'beans/createBean')
export const updateBean = journalWrite(remote.updateBean, 'beans/updateBean')
export const deleteBean = journalWrite(remote.deleteBean, 'beans/deleteBean')
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
