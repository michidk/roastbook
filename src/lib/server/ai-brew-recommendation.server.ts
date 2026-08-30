import { chat, type ModelMessage } from '@tanstack/ai'
import {
  createAiRequestLogMiddleware,
  startAiRequestLog,
} from '@/lib/server/ai-request-logs.server'
import {
  createAiAdapter,
  getOpenAIConfig,
} from '@/lib/server/ai-runtime.server'
import {
  buildShotRecommendationPrompt,
  type ShotRecommendation,
  type ShotRecommendationContext,
  shotRecommendationSchema,
} from '@/lib/shot-recommendation'

export async function recommendShotFromHistory(
  context: ShotRecommendationContext,
): Promise<ShotRecommendation> {
  const config = getOpenAIConfig()
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const systemPrompts = [
    'You are a precise coffee dialing assistant. Base every claim on the supplied filtered brew evidence and return the requested structured recommendation.',
  ]
  const messages: Array<ModelMessage> = [
    { role: 'user', content: buildShotRecommendationPrompt(context) },
  ]
  const requestLogId = await startAiRequestLog({
    requestType: 'shot-recommendation',
    model: config.researchModel,
    requestPayload: {
      model: config.researchModel,
      systemPrompts,
      messages,
      outputSchema: 'shotRecommendationSchema',
      stream: false,
    },
  })
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 45_000)

  try {
    return await chat({
      adapter: createAiAdapter(config.researchModel, config),
      systemPrompts,
      messages,
      outputSchema: shotRecommendationSchema,
      abortController,
      middleware: [
        createAiRequestLogMiddleware(requestLogId, config.researchModel),
      ],
      stream: false,
    })
  } finally {
    clearTimeout(timeout)
  }
}
