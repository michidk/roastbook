import * as remote from '@/lib/server/research'
import { integrationCapability } from './integration-capability'

// Standard AI runs on the server; demo probes expose only local preset actions.
export {
  extractBeanInfo,
  researchBeanInfo,
  researchMachineSettings,
  researchRoasterInfo,
} from '@/lib/server/research'
export const checkVisionEnabled = integrationCapability(() =>
  remote.checkVisionEnabled(),
)
export const checkResearchEnabled = integrationCapability(() =>
  remote.checkResearchEnabled(),
)
export const checkGearResearchEnabled = integrationCapability(() =>
  remote.checkGearResearchEnabled(),
)
export const checkRoasterResearchEnabled = integrationCapability(() =>
  remote.checkRoasterResearchEnabled(),
)
