import {
  createOpenaiChat,
  OPENAI_CHAT_MODELS,
  type OpenAIChatModel,
} from '@tanstack/ai-openai'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'

function isOpenAIChatModel(model: string): model is OpenAIChatModel {
  return (OPENAI_CHAT_MODELS as ReadonlyArray<string>).includes(model)
}

function resolveModel(
  envValue: string | undefined,
  fallback: OpenAIChatModel,
): OpenAIChatModel {
  return envValue && isOpenAIChatModel(envValue) ? envValue : fallback
}

export function getOpenAIConfig() {
  const environment = getServerEnv()
  return {
    apiKey: environment.OPENAI_API_KEY,
    baseURL: environment.OPENAI_BASE_URL,
    visionModel: environment.OPENAI_VISION_MODEL,
    researchModel: resolveModel(environment.OPENAI_RESEARCH_MODEL, 'gpt-4o'),
  }
}

export function createAiAdapter(
  model: OpenAIChatModel,
  config: ReturnType<typeof getOpenAIConfig>,
) {
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  return createOpenaiChat(model, config.apiKey, { baseURL: config.baseURL })
}

export function isVisionEnabled(): boolean {
  if (DEMO_MODE) return false
  return Boolean(getServerEnv().OPENAI_API_KEY)
}

export function isResearchEnabled(): boolean {
  if (DEMO_MODE) return false
  return Boolean(getServerEnv().OPENAI_API_KEY)
}
