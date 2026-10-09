import '@tanstack/react-start/server-only'
import {
  isAuthorizedShottimerRequest,
  loadShottimerTarget,
  recordShottimerShot,
} from '@/lib/server/shottimer.server'
import { shottimerShotRequestSchema } from '@/lib/shottimer'

const headers = { 'Cache-Control': 'no-store' }

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
}

/** `POST /api/shottimer/shots` from the device. */
export async function handleShottimerShotRequest(request: Request) {
  if (!(await isAuthorizedShottimerRequest(request))) return unauthorized()
  const body = shottimerShotRequestSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!body.success)
    return Response.json(
      { error: 'Expected {"seconds": <positive number>}' },
      { status: 400, headers },
    )
  await recordShottimerShot(body.data.seconds)
  return new Response(null, { status: 204, headers })
}

/** `GET /api/shottimer/target` from the device. */
export async function handleShottimerTargetRequest(request: Request) {
  if (!(await isAuthorizedShottimerRequest(request))) return unauthorized()
  return Response.json(
    { targetSeconds: await loadShottimerTarget() },
    { headers },
  )
}
