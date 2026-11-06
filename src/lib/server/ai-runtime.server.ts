import { openaiCompatibleText } from '@tanstack/ai-openai/compatible'
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-provider'
import { createAiProviderFetch } from '@/lib/server/ai-provider-fetch.server'
import { getAiRuntimeConfig } from './ai-provider-settings.server'

export async function getAiProviderConfig() {
  const settings = (await getAiRuntimeConfig()) ?? {
    ...DEFAULT_AI_PROVIDER,
    apiKey: undefined,
  }
  return {
    ...settings,
    providerMode: 'byo' as const,
    fetch: createAiProviderFetch(settings.baseURL),
  }
}

export function createAiAdapter(model: string, config: AiProviderConfig) {
  if (!config.apiKey)
    throw new Error('Connect your AI provider in Settings > AI')
  const options = {
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    fetch: config.fetch,
    maxRetries: 0,
    timeout: 120_000,
  }
  // The generic Responses adapter serializes hosted tools as function calls.
  // Model names come from validated user settings, not the SDK's static catalog.
  if (config.api === 'responses')
    return createOpenaiChat(model as OpenAIChatModel, config.apiKey, options)
  return openaiCompatibleText(model, { ...options, api: config.api })
}
export async function isVisionEnabled(): Promise<boolean> {
  return Boolean((await getAiProviderConfig()).apiKey)
}
export async function isResearchEnabled(): Promise<boolean> {
  const config = await getAiProviderConfig()
  return Boolean(config.apiKey) && config.api === 'responses'
}
export async function isRecommendationsEnabled(): Promise<boolean> {
  return Boolean((await getAiProviderConfig()).apiKey)
}

export type AiProviderConfig = Awaited<ReturnType<typeof getAiProviderConfig>>

import { createOpenaiChat, type OpenAIChatModel } from '@tanstack/ai-openai'
