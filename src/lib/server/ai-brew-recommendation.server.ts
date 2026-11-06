import type { ModelMessage } from '@tanstack/ai'
import {
  buildShotRecommendationPrompt,
  enforceShotRecommendation,
  type ShotRecommendation,
  type ShotRecommendationContext,
  shotRecommendationSchema,
} from '@/lib/shot-recommendation'
import {
  buildShotRecommendationChatMessages,
  parseShotRecommendationAnswer,
  type ShotRecommendationAnswer,
  type ShotRecommendationChatMessage,
  shotRecommendationAnswerWireSchema,
} from '@/lib/shot-recommendation-chat'
import { AiOutputError, runAiRequest } from './ai-request.server'
import { getAiProviderConfig } from './ai-runtime.server'

export async function recommendShotFromHistory(
  context: ShotRecommendationContext,
): Promise<ShotRecommendation> {
  const config = await getAiProviderConfig()
  if (!config.apiKey) {
    throw new Error('Connect your AI provider in Settings > AI')
  }

  const systemPrompts = [
    'You are a precise coffee dialing assistant. Ground claims about the user’s brews in the supplied filtered evidence, accounting for human recording errors and subjective taste-profile outliers. Clearly distinguish general, bean-appropriate starting heuristics from observed results. Return the requested structured recommendation.',
  ]
  const messages: Array<ModelMessage> = [
    { role: 'user', content: buildShotRecommendationPrompt(context) },
  ]
  return runAiRequest({
    config,
    model: config.researchModel,
    requestType: 'shot-recommendation',
    timeoutMs: 45_000,
    recordContent: true,
    requestPayload: {
      model: config.researchModel,
      systemPrompts,
      messages,
      outputSchema: 'shotRecommendationSchema',
    },
    execute: async ({ generateObject }) => {
      const recommendation = enforceShotRecommendation(
        await generateObject({
          systemPrompts,
          messages,
          outputSchema: shotRecommendationSchema,
        }),
        context.enabledParameters,
      )
      if (!recommendation)
        throw new AiOutputError(
          'The AI suggested a change this brewing method does not record. Please try again.',
        )
      return recommendation
    },
  })
}

export async function answerShotRecommendationQuestion(
  context: ShotRecommendationContext,
  recommendation: ShotRecommendation,
  conversation: readonly ShotRecommendationChatMessage[],
): Promise<ShotRecommendationAnswer> {
  const config = await getAiProviderConfig()
  if (!config.apiKey) {
    throw new Error('Connect your AI provider in Settings > AI')
  }

  const { systemPrompts, messages } = buildShotRecommendationChatMessages(
    context,
    recommendation,
    conversation,
  )
  return runAiRequest({
    config,
    model: config.researchModel,
    requestType: 'shot-recommendation-chat',
    timeoutMs: 45_000,
    recordContent: true,
    requestPayload: {
      model: config.researchModel,
      systemPrompts,
      messages,
      outputSchema: 'shotRecommendationAnswerWireSchema',
    },
    execute: async ({ generateObject }) =>
      parseShotRecommendationAnswer(
        await generateObject({
          systemPrompts,
          messages,
          outputSchema: shotRecommendationAnswerWireSchema,
        }),
      ),
  })
}
