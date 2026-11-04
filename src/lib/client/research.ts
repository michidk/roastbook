import * as remote from '@/lib/server/research'
import { integrationCapability } from './integration-capability'

// AI runs only on the server; probes report "unavailable" offline and in the demo.
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
