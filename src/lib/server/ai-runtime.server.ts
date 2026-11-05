import { openaiCompatibleText } from '@tanstack/ai-openai/compatible'
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-provider'
import { createAiProviderFetch } from '@/lib/server/ai-provider-fetch.server'
import { getAiRuntimeConfig } from './ai-provider-settings.server'

export async function getOpenAIConfig() {
  const settings = (await getAiRuntimeConfig()) ?? {
    ...DEFAULT_AI_PROVIDER,
    apiKey: undefined,
  }
  return {
    ...settings,
    providerMode: 'byo' as const,
    fetch: createAiProviderFetch(settings.baseURL),
    visionRequestLimits: {},
    authFailureMessage:
      'AI service authentication failed. Update the configured API key.',
  }
}

export function createAiAdapter(
  model: string,
  config: Awaited<ReturnType<typeof getOpenAIConfig>>,
) {
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
  return Boolean((await getOpenAIConfig()).apiKey)
}
export async function isResearchEnabled(): Promise<boolean> {
  const config = await getOpenAIConfig()
  return Boolean(config.apiKey) && config.api === 'responses'
}
export async function isRecommendationsEnabled(): Promise<boolean> {
  return Boolean((await getOpenAIConfig()).apiKey)
}

export function aiChatLimits(
  _config: Awaited<ReturnType<typeof getOpenAIConfig>>,
) {
  return {}
}

import { createOpenaiChat, type OpenAIChatModel } from '@tanstack/ai-openai'
