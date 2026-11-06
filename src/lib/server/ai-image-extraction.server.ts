import type { ModelMessage } from '@tanstack/ai'
import {
  BEAN_IMAGE_INFO_FIELDS,
  beanInfoPrompt,
} from '@/lib/server/ai-research-fields.server'
import { parseStructuredResearchResult } from '@/lib/structured-research'
import type { ExtractedBeanInfo } from '@/modules/ai/read-models'
import type { PreparedAiImage } from './ai-images.server'
import { runAiRequest } from './ai-request.server'
import { getAiProviderConfig } from './ai-runtime.server'

export async function extractBeanInfoFromImages(
  images: readonly PreparedAiImage[],
): Promise<ExtractedBeanInfo> {
  const config = await getAiProviderConfig()
  const systemPrompts = [
    beanInfoPrompt(
      'Extract coffee bean information from product images (bags, labels, packaging). Several images may show different sides of the same bag; combine what they show into one result.',
      'Only include fields where you can clearly read the information. Do not guess.',
    ),
  ]
  const messages: ModelMessage[] = [
    {
      role: 'user',
      content: [
        ...images.map((image) => ({
          type: 'image' as const,
          source: {
            type: 'data' as const,
            value: image.bytes.toString('base64'),
            mimeType: image.mimeType,
          },
          metadata: { detail: 'high' as const },
        })),
        {
          type: 'text',
          content:
            'Extract the coffee bean information from these images of the same coffee.',
        },
      ],
    },
  ]
  return runAiRequest({
    config,
    model: config.visionModel,
    requestType: 'bean-image-extraction',
    timeoutMs: 45_000,
    requestPayload: {
      model: config.visionModel,
      imageCount: images.length,
      imageBytes: images.reduce(
        (sum, image) => sum + image.bytes.byteLength,
        0,
      ),
      images: images.map(({ width, height, mimeType }) => ({
        width,
        height,
        mimeType,
      })),
      detail: 'high',
    },
    execute: async ({ generateText }) =>
      parseStructuredResearchResult(
        await generateText({ systemPrompts, messages, format: 'json-object' }),
        BEAN_IMAGE_INFO_FIELDS,
      ),
  })
}
