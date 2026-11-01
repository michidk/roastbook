import type { z } from 'zod'
import { requireFeature } from '@/lib/app-capabilities'
import { isConnectionOnline } from '@/lib/connection-status'
import {
  chatAboutShotRecommendation as requestAnswer,
  getShotRecommendationOptions as requestOptions,
  getShotRecommendation as requestRecommendation,
} from '@/lib/server/shot-recommendations'
import {
  type ShotRecommendationRequest,
  shotRecommendationRequestSchema,
} from '@/lib/shot-recommendation'
import { shotRecommendationChatRequestSchema } from '@/lib/shot-recommendation-chat'

export function getShotRecommendationOptions({
  data,
}: {
  readonly data: ShotRecommendationRequest
}) {
  requireFeature('ai', { online: isConnectionOnline() })
  return requestOptions({ data: shotRecommendationRequestSchema.parse(data) })
}

export function getShotRecommendation({
  data,
}: {
  readonly data: ShotRecommendationRequest
}) {
  requireFeature('ai', { online: isConnectionOnline() })
  return requestRecommendation({
    data: shotRecommendationRequestSchema.parse(data),
  })
}

export function chatAboutShotRecommendation({
  data,
}: {
  readonly data: z.input<typeof shotRecommendationChatRequestSchema>
}) {
  requireFeature('ai', { online: isConnectionOnline() })
  return requestAnswer({
    data: shotRecommendationChatRequestSchema.parse(data),
  })
}
