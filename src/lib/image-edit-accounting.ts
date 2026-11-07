import { z } from 'zod'

export const IMAGE_EDIT_MODEL = 'gpt-image-1.5'
export const IMAGE_EDIT_PRICING = {
  version: 'openai-gpt-image-1.5-2026-11-06',
  source: 'https://developers.openai.com/api/docs/models/gpt-image-1.5',
  textInput: 5,
  cachedTextInput: 1.25,
  imageInput: 8,
  cachedImageInput: 2,
  imageOutput: 32,
} as const

const tokens = z.number().int().nonnegative()
export const imageEditUsageSchema = z
  .object({
    input_tokens: tokens,
    output_tokens: tokens,
    total_tokens: tokens,
    input_tokens_details: z.object({
      text_tokens: tokens,
      image_tokens: tokens,
      cached_tokens: tokens.optional(),
      cached_tokens_details: z
        .object({
          text_tokens: tokens,
          image_tokens: tokens,
        })
        .optional(),
    }),
  })
  .superRefine((usage, context) => {
    const details = usage.input_tokens_details
    const cached = details.cached_tokens_details
    if (
      details.text_tokens + details.image_tokens !== usage.input_tokens ||
      usage.input_tokens + usage.output_tokens !== usage.total_tokens ||
      (details.cached_tokens ?? 0) > usage.input_tokens ||
      (cached &&
        (cached.text_tokens > details.text_tokens ||
          cached.image_tokens > details.image_tokens ||
          cached.text_tokens + cached.image_tokens !==
            (details.cached_tokens ?? 0)))
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent image token usage',
      })
  })

export function imageEditAccounting(raw: unknown, baseURL: string) {
  const parsed = imageEditUsageSchema.safeParse(raw)
  const usage = parsed.success ? parsed.data : null
  const details = usage?.input_tokens_details
  const cached = details?.cached_tokens_details
  const official =
    new URL(baseURL).href.replace(/\/$/, '') === 'https://api.openai.com/v1'
  const priced =
    official && usage && details && (!(details.cached_tokens ?? 0) || cached)
  const inputCost = priced
    ? ((details.text_tokens - (cached?.text_tokens ?? 0)) *
        IMAGE_EDIT_PRICING.textInput +
        (cached?.text_tokens ?? 0) * IMAGE_EDIT_PRICING.cachedTextInput +
        (details.image_tokens - (cached?.image_tokens ?? 0)) *
          IMAGE_EDIT_PRICING.imageInput +
        (cached?.image_tokens ?? 0) * IMAGE_EDIT_PRICING.cachedImageInput) /
      1_000_000
    : null
  const outputCost = priced
    ? (usage.output_tokens * IMAGE_EDIT_PRICING.imageOutput) / 1_000_000
    : null
  return {
    model: IMAGE_EDIT_MODEL,
    usage,
    currency: 'USD',
    pricing: official ? IMAGE_EDIT_PRICING : null,
    inputCost,
    outputCost,
    totalCost:
      inputCost !== null && outputCost !== null ? inputCost + outputCost : null,
  }
}
export type ImageEditAccounting = ReturnType<typeof imageEditAccounting>
