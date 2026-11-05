import { createServerFn } from '@tanstack/react-start'

export const getAnalyticsConfig = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getHostedEnv } = await import('./hosted-env.server')
    return { projectToken: getHostedEnv().POSTHOG_PROJECT_TOKEN ?? null }
  },
)
