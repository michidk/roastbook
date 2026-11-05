import { z } from 'zod'
import { shotRecommendationSchema } from '@/lib/shot-recommendation'
import { shotRecommendationAnswerSchema } from '@/lib/shot-recommendation-chat'

const resultSchema = z.object({
  recommendation: shotRecommendationSchema,
  basis: z.object({
    beanName: z.string(),
    brewingMethodName: z.string(),
    gearNames: z.array(z.string()),
    matchingShotCount: z.number(),
    historyIncluded: z.number(),
    historyTruncated: z.boolean(),
    focusedShotAt: z.coerce.date().nullable(),
    latestShotAt: z.coerce.date().nullable(),
  }),
})

export const demoAiResponsesSchema = z.object({
  beans: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      fallback: resultSchema,
      answers: z.array(shotRecommendationAnswerSchema).length(3),
      research: z.object({
        name: z.string(),
        roaster: z.string(),
        origin: z.string(),
        region: z.string(),
        process: z.string(),
        roastLevel: z.string(),
        notes: z.string(),
      }),
    }),
  ),
  brews: z.array(
    z.object({
      id: z.number(),
      beanId: z.number(),
      brewingMethodId: z.number(),
      setupKey: z.string(),
      option: z.object({
        historyShotId: z.number(),
        brewingMethodId: z.number(),
        brewingMethodName: z.string(),
        setupName: z.string(),
      }),
      result: resultSchema,
      answers: z.array(shotRecommendationAnswerSchema).length(3),
    }),
  ),
})
export type DemoAiResponses = z.infer<typeof demoAiResponsesSchema>
