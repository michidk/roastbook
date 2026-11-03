import { demoCapabilityDisabled } from '@/lib/demo/disabled'
import { toDisplayableError } from '@/lib/error-display'

const disabled = () => demoCapabilityDisabled('Integrations')
export const isVisionEnabled = async () => false
export const isResearchEnabled = async () => false
export const isRecommendationsEnabled = async () => false
export const extractBeanInfoFromImages = disabled
export const researchBeanFromWeb = disabled
export const researchMachineFromWeb = disabled
export const researchRoasterFromWeb = disabled
export const validateImageBuffer = disabled
export const createAiImage = disabled
export const refreshWebsiteFaviconBestEffort = async () => undefined
export const deleteWebsiteFaviconBestEffort = async () => undefined
export const toDisplayableDatabaseError = async (error: unknown) =>
  toDisplayableError(error)

export function createAsyncTtlCache<T, Value>({
  load,
}: {
  load: (input: T) => Promise<Value>
}) {
  return load
}
