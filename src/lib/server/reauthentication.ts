import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { issueReauthentication } from '@/lib/server/auth/reauthentication.server'
import { reauthenticationActionSchema } from '@/modules/auth/reauthentication'

export const confirmReauthentication = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      action: reauthenticationActionSchema,
      userId: z.string().min(1).max(128),
    }),
  )
  .handler(({ data }) => issueReauthentication(data.action, data.userId))
