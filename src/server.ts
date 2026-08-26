import type { Register } from '@tanstack/react-router'
import type { RequestHandler } from '@tanstack/react-start/server'
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { publicEnv } from '@/lib/env'
import { injectHeadHtml } from '@/lib/head-html.server'

const startHandler = createStartHandler(defaultStreamHandler)

const fetch: RequestHandler<Register> = async (request, options) => {
  const response = await startHandler(request, options)
  return injectHeadHtml(response, publicEnv.VITE_HEAD_HTML)
}

export default { fetch }
