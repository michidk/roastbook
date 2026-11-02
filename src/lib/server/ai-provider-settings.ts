import { createServerFn } from '@tanstack/react-start'
import { aiProviderSettingsSchema } from '@/lib/ai-provider'
import {
  loadAiProviderSettings,
  removeAiProviderSettings,
  saveAiProviderSettings,
} from './ai-provider-settings.server'

export const getAiProviderSettings = createServerFn({ method: 'GET' }).handler(
  loadAiProviderSettings,
)
export const updateAiProviderSettings = createServerFn({ method: 'POST' })
  .validator(aiProviderSettingsSchema)
  .handler(({ data }) => saveAiProviderSettings(data))
export const clearAiProviderSettings = createServerFn({
  method: 'POST',
}).handler(removeAiProviderSettings)
