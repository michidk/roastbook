import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getAccountPreferences = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { loadAccountPreferences } = await import('./preferences.server')
    return loadAccountPreferences()
  },
)

export const setNewsletterOptIn = createServerFn({ method: 'POST' })
  .validator(z.boolean())
  .handler(async ({ data }) => {
    const { saveNewsletterOptIn } = await import('./preferences.server')
    await saveNewsletterOptIn(data)
  })
