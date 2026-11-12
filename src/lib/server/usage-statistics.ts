import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { browserUsageEventSchema } from '@/modules/usage-statistics/contract'
import {
  loadUsagePreference,
  recordUsageEvent,
  saveUsagePreference,
} from './usage-statistics.server'

export const getUsagePreference = createServerFn({ method: 'GET' }).handler(
  loadUsagePreference,
)
export const setUsagePreference = createServerFn({ method: 'POST' })
  .validator(z.boolean())
  .handler(({ data }) => saveUsagePreference(data))

export const sendBrowserUsageEvent = createServerFn({ method: 'POST' })
  .validator(browserUsageEventSchema)
  .handler(({ data }) => {
    void recordUsageEvent(data)
  })
