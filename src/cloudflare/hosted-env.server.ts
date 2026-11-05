import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { requireCloudflareRuntime } from './context.server'

const optionalString = z.string().trim().min(1).optional()

const schema = z.object({
  POSTHOG_PROJECT_TOKEN: optionalString,
  POSTHOG_PROJECT_ID: optionalString,
  POSTHOG_PERSONAL_API_KEY: optionalString,
  AI_PROVIDED_API_KEY: optionalString,
  AI_PROVIDED_BASE_URL: z
    .url()
    .refine((value) => {
      const url = new URL(value)
      return (
        ['https:', 'http:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      )
    }, 'Use an HTTP(S) base URL without credentials, query parameters, or a fragment')
    .default('https://api.openai.com/v1'),
  AI_PROVIDED_API: z
    .enum(['responses', 'chat-completions'])
    .default('responses'),
  AI_PROVIDED_VISION_MODEL: optionalString,
  AI_PROVIDED_RESEARCH_MODEL: optionalString,
})

const cache = new WeakMap<object, z.infer<typeof schema>>()

/** Hosted-only settings (provided AI, request log, PostHog); public omits them. */
export function getHostedEnv() {
  const { bindings, variables } = requireCloudflareRuntime()
  let parsed = cache.get(bindings)
  if (!parsed) {
    parsed = schema.parse(
      Object.fromEntries(
        Object.entries(variables).map(([name, value]) => [name, value || undefined]),
      ),
    )
    cache.set(bindings, parsed)
  }
  return parsed
}
