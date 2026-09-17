import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withResourceLimits } from '@/lib/server/resource-limits.server'

export const downloadRemoteImage = createServerFn({ method: 'POST' })
  .validator(z.object({ url: z.url().max(2_048) }))
  .handler(async ({ data }) =>
    withResourceLimits('remote-image-download', async () => {
      const { downloadImage } = await import('@/lib/server/remote-image.server')
      return downloadImage(data.url)
    }),
  )
