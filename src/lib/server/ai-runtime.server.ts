import { openaiCompatibleText } from '@tanstack/ai-openai/compatible'
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-provider'
import { createAiProviderFetch } from './ai-provider-fetch.server'
import {
  getAiRuntimeConfig,
  readAiProviderCredentials,
} from './ai-provider-settings.server'

export async function getOpenAIConfig() {
  return (
    (await getAiRuntimeConfig()) ?? {
      ...DEFAULT_AI_PROVIDER,
      apiKey: undefined,
    }
  )
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
    fetch: createAiProviderFetch(config.baseURL),
    maxRetries: 0,
    timeout: 120_000,
  })
}
export async function isVisionEnabled(): Promise<boolean> {
  return Boolean(await readAiProviderCredentials())
}
export async function isResearchEnabled(): Promise<boolean> {
  return (await readAiProviderCredentials())?.api === 'responses'
}
export async function isRecommendationsEnabled(): Promise<boolean> {
  return Boolean(await readAiProviderCredentials())
}
