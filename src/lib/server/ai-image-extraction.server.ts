import { z } from 'zod'
import {
  completeAiRequestLog,
  failAiRequestLog,
  startAiRequestLog,
} from '@/lib/server/ai-request-logs.server'
import {
  BEAN_IMAGE_INFO_FIELDS,
  beanInfoPrompt,
} from '@/lib/server/ai-research-fields.server'
import { getOpenAIConfig } from '@/lib/server/ai-runtime.server'
import { parseStructuredResearchResult } from '@/lib/structured-research'
import type { ExtractedBeanInfo } from '@/modules/ai/read-models'

export async function extractBeanInfoFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<ExtractedBeanInfo> {
  const config = getOpenAIConfig()
  if (!config.apiKey) return {}

  const systemPrompt = beanInfoPrompt(
    'Extract coffee bean information from product images (bags, labels, packaging).',
    'Only include fields where you can clearly read the information. Do not guess.',
  )
  const requestLogId = await startAiRequestLog({
    requestType: 'bean-image-extraction',
    model: config.visionModel,
    requestPayload: {
      model: config.visionModel,
      mimeType,
      imageBytes: Buffer.byteLength(imageBase64, 'base64'),
      stream: false,
    },
  })
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 45_000)
  const startedAt = Date.now()

  try {
    const baseURL = (config.baseURL ?? 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    )
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.visionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Extract the coffee bean information from this image.',
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
      signal: abortController.signal,
    })
    const responseBody: unknown = await response.json()
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'AI service authentication failed. Update the configured API key.',
        )
      }
      const providerError = z
        .object({ error: z.object({ message: z.string() }) })
        .safeParse(responseBody)
      throw new Error(
        providerError.success
          ? providerError.data.error.message
          : `Vision provider request failed (${response.status})`,
      )
    }
    const result = z
      .object({
        choices: z.array(
          z.object({ message: z.object({ content: z.string().nullable() }) }),
        ),
        usage: z
          .object({
            prompt_tokens: z.number().int().nonnegative(),
            completion_tokens: z.number().int().nonnegative(),
            total_tokens: z.number().int().nonnegative(),
            prompt_tokens_details: z
              .object({
                cached_tokens: z.number().int().nonnegative().optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .parse(responseBody)
    const content = result.choices[0]?.message.content ?? ''
    const extracted = content
      ? parseStructuredResearchResult(content, BEAN_IMAGE_INFO_FIELDS)
      : {}
    const usage = result.usage
      ? {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
          ...(result.usage.prompt_tokens_details?.cached_tokens
            ? {
                promptTokensDetails: {
                  cachedTokens:
                    result.usage.prompt_tokens_details.cached_tokens,
                },
              }
            : undefined),
        }
      : undefined
    await completeAiRequestLog({
      logId: requestLogId,
      model: config.visionModel,
      responsePayload: { content, fields: Object.keys(extracted) },
      usage,
      durationMs: Date.now() - startedAt,
    })
    console.info('[Bean image extraction] completed', {
      model: config.visionModel,
      responseCharacters: content.length,
      fields: Object.keys(extracted),
    })
    return extracted
  } catch (error) {
    await failAiRequestLog({
      logId: requestLogId,
      model: config.visionModel,
      error,
      durationMs: Date.now() - startedAt,
    })
    console.error('[Bean image extraction] failed', {
      model: config.visionModel,
      error,
    })
    if (abortController.signal.aborted) {
      throw new Error('Image analysis timed out. Please try again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
