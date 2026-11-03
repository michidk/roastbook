import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'
import { getJournalContext } from '@/db/journal-context.server'
import { DEMO_MODE } from '@/lib/build-mode'
import { fetchWithConnectionStatus } from '@/lib/connection-status'
import { handleJournalRequest } from '@/lib/server/auth/request.server'
import {
  demoModeReadOnlyResponse,
  isDemoServerRequestBlocked,
} from '@/lib/server/demo-mode.server'

const identityRequestMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    if (DEMO_MODE || getJournalContext()) return next()
    let result: Awaited<ReturnType<typeof next>> | undefined
    const response = await handleJournalRequest(request, async () => {
      result = await next()
      return result.response
    })
    return result ? { ...result, response } : response
  },
)

const demoReadOnlyRequestMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const path = new URL(request.url).pathname
    if (isDemoServerRequestBlocked(DEMO_MODE, request.method, path))
      return demoModeReadOnlyResponse()
    return next()
  },
)

export const startInstance = createStart(() => ({
  serverFns: { fetch: fetchWithConnectionStatus },
  requestMiddleware: [
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' }),
    demoReadOnlyRequestMiddleware,
    identityRequestMiddleware,
  ],
}))
