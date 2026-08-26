import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_HEAD_HTML: z.string().trim().optional(),
    VITE_STORAGE_URL: z
      .string()
      .trim()
      .transform((value) => value || '/media')
      .default('/media'),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})

export const publicEnv = {
  VITE_HEAD_HTML: env.VITE_HEAD_HTML,
  VITE_STORAGE_URL: env.VITE_STORAGE_URL,
} as const
