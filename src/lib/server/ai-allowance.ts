import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { changeUserAiLimit } from '@/lib/server/auth/account.server'
import { loadAiAllowance, selectAiProvider } from './ai-allowance.server'

export const getAiAllowance = createServerFn({ method: 'GET' }).handler(
  loadAiAllowance,
)

export const setAiProviderMode = createServerFn({ method: 'POST' })
  .validator(z.enum(['provided', 'byo']))
  .handler(({ data }) => selectAiProvider(data))

export const setUserAiLimit = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string().min(1).max(128),
      limit: z.number().int().min(0).max(2147483647),
    }),
  )
  .handler(({ data }) => changeUserAiLimit(data.userId, data.limit))
