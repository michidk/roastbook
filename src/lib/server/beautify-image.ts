import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { entityImageIdSchema } from '@/lib/server-validation'
import { prepareEntityImageBeautification } from './image-beautification.server'

export const prepareBeautifiedImage = createServerFn({ method: 'POST' })
  .validator(
    entityImageIdSchema.extend({ automatic: z.boolean().default(false) }),
  )
  .handler(({ data }) => prepareEntityImageBeautification(data))
