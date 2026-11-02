import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { aiProviderSettingsSchema } from '@/lib/ai-provider'
import { selectAiProvider } from './ai-allowance.server'
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

export const setAiProviderMode = createServerFn({ method: 'POST' })
  .validator(z.enum(['provided', 'byo']))
  .handler(({ data }) => selectAiProvider(data))
