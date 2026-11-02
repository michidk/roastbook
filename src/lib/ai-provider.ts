import { z } from 'zod'

export const DEFAULT_AI_PROVIDER = {
  baseURL: 'https://api.openai.com/v1',
  api: 'responses' as const,
  visionModel: 'gpt-5.1-codex',
  researchModel: 'gpt-5.1-codex',
}

const model = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[\w./:@+-]+$/)
export const aiProviderSettingsSchema = z.object({
  baseURL: z.url().max(2048),
  api: z.enum(['responses', 'chat-completions']),
  visionModel: model,
  researchModel: model,
  apiKey: z
    .string()
    .trim()
    .min(1)
    .max(4096)
    .regex(/^[\x21-\x7e]+$/)
    .optional(),
})
export type AiProviderSettingsInput = z.infer<typeof aiProviderSettingsSchema>
