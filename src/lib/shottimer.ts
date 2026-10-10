import { z } from 'zod'
import { DECIMAL_CONSTRAINTS } from '@/lib/measurement-constraints'

export type ShottimerSettings = {
  readonly enabled: boolean
  readonly hasToken: boolean
}

export type ShottimerShot = {
  readonly seconds: number
  readonly receivedAt: string
}

/** Brew times in seconds as accepted from the device and the brew form. */
export const shottimerSecondsSchema = z
  .number()
  .finite()
  .positive()
  .max(DECIMAL_CONSTRAINTS.shotTimeSeconds.maximum)
  .transform((seconds) => Math.round(seconds * 100) / 100)

export const shottimerShotRequestSchema = z.object({
  seconds: shottimerSecondsSchema,
})
