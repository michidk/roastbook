import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  loadUsagePreference,
  saveUsagePreference,
} from './usage-statistics.server'

export const getUsagePreference = createServerFn({ method: 'GET' }).handler(
  loadUsagePreference,
)
export const setUsagePreference = createServerFn({ method: 'POST' })
  .validator(z.boolean())
  .handler(({ data }) => saveUsagePreference(data))
