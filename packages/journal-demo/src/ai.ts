import { z } from 'zod'
import {
  isFocusedShotRecommendationRequest,
  shotRecommendationRequestSchema,
} from '@/lib/shot-recommendation'
import { shotRecommendationChatRequestSchema } from '@/lib/shot-recommendation-chat'
import { type DemoAiResponses, demoAiResponsesSchema } from './ai-responses'

let responses: Promise<DemoAiResponses> | undefined
function loadResponses() {
  responses ??= fetch('/demo-local/ai.json')
    .then(async (response) => {
      if (!response.ok)
        throw new Error(
          'Could not load the preset demo responses. Reload to retry.',
        )
      return demoAiResponsesSchema.parse(await response.json())
    })
    .catch((error) => {
      responses = undefined
      throw error
    })
  return responses
}
const optionsSchema = z.object({ data: z.unknown() })

export async function demoAiFunction(operation: string, options: unknown) {
  if (
    operation === 'shot-recommendations/checkShotRecommendationEnabled' ||
    operation === 'research/checkResearchEnabled'
  )
    return { enabled: true }
  const presets = await loadResponses()
  const data = optionsSchema.parse(options).data
  if (operation === 'research/researchBeanInfo') {
    const request = z
      .object({ beanName: z.string(), roasterName: z.string().optional() })
      .parse(data)
    const bean = presets.beans.find(
      (bean) =>
        bean.name.toLowerCase() === request.beanName.trim().toLowerCase() &&
        (!request.roasterName ||
          bean.research.roaster.toLowerCase() ===
            request.roasterName.trim().toLowerCase()),
    )
    if (!bean)
      throw new Error(
        'Preset research is available only for the original demo beans.',
      )
    return bean.research
  }
  const request =
    operation === 'shot-recommendations/chatAboutShotRecommendation'
      ? shotRecommendationChatRequestSchema.parse(data).request
      : shotRecommendationRequestSchema.parse(data)
  const focused = isFocusedShotRecommendationRequest(request)
  const matching = presets.brews.filter((brew) =>
    focused
      ? brew.id === request.shotId
      : brew.beanId === request.beanId &&
        (!request.brewingMethodId ||
          brew.brewingMethodId === request.brewingMethodId),
  )
  if (operation === 'shot-recommendations/getShotRecommendationOptions') {
    if (focused || request.currentDraft) return []
    return matching
      .filter(
        (brew, index) =>
          matching.findIndex((other) => other.setupKey === brew.setupKey) ===
          index,
      )
      .map((brew) => brew.option)
  }
  const preset =
    !focused && request.historyShotId
      ? matching.find((brew) => brew.id === request.historyShotId)
      : matching[0]
  const fallback =
    !focused &&
    !request.historyShotId &&
    !presets.brews.some((brew) => brew.beanId === request.beanId)
      ? presets.beans.find((bean) => bean.id === request.beanId)
      : undefined
  const result = preset?.result ?? fallback?.fallback
  const answers = preset?.answers ?? fallback?.answers
  if (!result || !answers)
    throw new Error(
      'No preset recommendation exists for this bean and brewing method. Try an original sample brew. Demo edits are not analyzed.',
    )
  if (operation === 'shot-recommendations/chatAboutShotRecommendation') {
    const chat = shotRecommendationChatRequestSchema.parse(data)
    const question = chat.messages.at(-1)?.content
    const index = result.recommendation.followUpQuestions.indexOf(
      question ?? '',
    )
    return {
      answer:
        index < 0
          ? {
              blocks: [
                {
                  type: 'note',
                  text: 'This demo has preset answers. Choose one of the suggested questions to explore this sample recommendation. Custom questions require an AI provider in a standard Roastbook installation.',
                },
              ],
            }
          : answers[index],
    }
  }
  return {
    ...result,
    basis: {
      ...result.basis,
      focusedShotAt: focused ? result.basis.focusedShotAt : null,
    },
  }
}

export function hasDemoAiResponse(operation: string) {
  return (
    operation.startsWith('shot-recommendations/') ||
    operation === 'research/checkResearchEnabled' ||
    operation === 'research/researchBeanInfo'
  )
}
