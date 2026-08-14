import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const publicEnv = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_STORAGE_URL: z.string().trim().min(1).default('/media'),
  },
  runtimeEnvStrict: {
    VITE_STORAGE_URL: import.meta.env.VITE_STORAGE_URL,
  },
  emptyStringAsUndefined: true,
})
