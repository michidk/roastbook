import { createServerFn } from '@tanstack/react-start'
import { aiProviderSettingsSchema } from '@/lib/ai-provider'
import { reauthenticationTokenSchema } from '@/modules/auth/reauthentication'
import {
  loadAiProviderSettings,
  removeAiProviderSettings,
  saveAiProviderSettings,
} from './ai-provider-settings.server'

export const getAiProviderSettings = createServerFn({ method: 'GET' }).handler(
  loadAiProviderSettings,
)
export const updateAiProviderSettings = createServerFn({ method: 'POST' })
  .validator(
    aiProviderSettingsSchema.extend({
      reauthToken: reauthenticationTokenSchema,
    }),
  )
  .handler(({ data: { reauthToken, ...settings } }) =>
    saveAiProviderSettings(settings, reauthToken),
  )
export const clearAiProviderSettings = createServerFn({
  method: 'POST',
}).handler(removeAiProviderSettings)
