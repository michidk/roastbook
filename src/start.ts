import { createMiddleware, createStart } from '@tanstack/react-start'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  demoModeReadOnlyResponse,
  isDemoModeWriteRequest,
} from '@/lib/server/demo-mode.server'

const demoReadOnlyRequestMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    if (isDemoModeWriteRequest(DEMO_MODE, request.method))
      return demoModeReadOnlyResponse()
    return next()
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [demoReadOnlyRequestMiddleware],
}))
