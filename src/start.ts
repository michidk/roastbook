import { createMiddleware, createStart } from '@tanstack/react-start'
import { getServerEnv } from '@/lib/env.server'
import {
  demoModeReadOnlyResponse,
  isDemoModeWriteRequest,
} from '@/lib/server/demo-mode.server'

const demoReadOnlyRequestMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    if (isDemoModeWriteRequest(getServerEnv().DEMO_MODE, request.method))
      return demoModeReadOnlyResponse()
    return next()
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [demoReadOnlyRequestMiddleware],
}))
