import { createServerFn } from '@tanstack/react-start'
import { loadAiRequestStats } from '@/cloudflare/ai-request-logs.server'

export const getProvidedAiRequestStats = createServerFn({
  method: 'GET',
}).handler(() => loadAiRequestStats('provided'))
