import { maxIterations } from '@tanstack/ai'
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible'
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-provider'
import { loadAiAllowance, providedAiConfig } from './ai-allowance.server'
import {
  createAiProviderFetch,
  createProvidedAiFetch,
} from './ai-provider-fetch.server'
import { getAiRuntimeConfig } from './ai-provider-settings.server'

export async function getOpenAIConfig() {
  const allowance = await loadAiAllowance()
  if (allowance.mode === 'provided') {
    const config = providedAiConfig()
    if (!config) throw new Error('Provided AI is unavailable')
    return config
  }
  return {
    ...((await getAiRuntimeConfig()) ?? {
      ...DEFAULT_AI_PROVIDER,
      apiKey: undefined,
    }),
    providerMode: 'byo' as const,
  }
}

export function createAiAdapter(
  model: string,
  config: Awaited<ReturnType<typeof getOpenAIConfig>>,
) {
  if (!config.apiKey)
    throw new Error('Connect your AI provider in Settings > AI')
  return openaiCompatibleText(model, {
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    api: config.api,
    fetch:
      config.providerMode === 'provided'
        ? createProvidedAiFetch()
        : createAiProviderFetch(config.baseURL),
    maxRetries: 0,
    timeout: 120_000,
  })
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
  config: Awaited<ReturnType<typeof getOpenAIConfig>>,
) {
  return config.providerMode === 'provided'
    ? {
        modelOptions:
          config.api === 'responses'
            ? { max_output_tokens: 4096, max_tool_calls: 3 }
            : { max_completion_tokens: 4096 },
        agentLoopStrategy: maxIterations(2),
        retry: { maxRetries: 0 },
      }
    : {}
}
