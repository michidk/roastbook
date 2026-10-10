import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  dismissShottimerShot,
  loadPendingShottimerShot,
  loadShottimerSettings,
  regenerateShottimerToken,
  setShottimerEnabled,
  setShottimerTarget,
} from '@/lib/server/shottimer.server'
import { shottimerSecondsSchema } from '@/lib/shottimer'

export const getShottimerSettings = createServerFn({ method: 'GET' }).handler(
  () => loadShottimerSettings(),
)

export const updateShottimerEnabled = createServerFn({ method: 'POST' })
  .validator((value: unknown) => z.boolean().parse(value))
  .handler(({ data: enabled }) => setShottimerEnabled(enabled))

export const createShottimerToken = createServerFn({ method: 'POST' }).handler(
  () => regenerateShottimerToken(),
)

export const getPendingShottimerShot = createServerFn({
  method: 'GET',
}).handler(() => loadPendingShottimerShot())

export const dismissPendingShottimerShot = createServerFn({ method: 'POST' })
  .validator((value: unknown) => z.string().datetime().parse(value))
  .handler(({ data: receivedAt }) => dismissShottimerShot(receivedAt))

export const reportShottimerTarget = createServerFn({ method: 'POST' })
  .validator((value: unknown) => shottimerSecondsSchema.nullable().parse(value))
  .handler(({ data: targetTimeSeconds }) =>
    setShottimerTarget(targetTimeSeconds),
  )
