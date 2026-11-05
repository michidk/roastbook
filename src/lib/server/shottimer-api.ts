import '@tanstack/react-start/server-only'
import { getJournalContext } from '@/db/journal-context.server'
import { ShottimerDisabledError } from '@/lib/server/shottimer.server'
import { getIntegrationOperation } from './integrations/operations.server'
import {
  admitIntegrationRequest,
  describeIntegrationError,
  runIntegrationOperation,
} from './integrations/runtime.server'

const noStore = { 'Cache-Control': 'no-store' }

function unauthorized() {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401, headers: noStore },
  )
}

/**
 * The device paths the shottimer firmware calls. They authenticate with an
 * API key holding the shottimer scope and run the same operations as
 * `/api/v1/shottimer/*`, keeping the device's response shapes.
 */
async function runDeviceOperation(
  name: 'report_shot_time' | 'get_shot_target',
  input: unknown,
  respond: (result: unknown, headers: Headers) => Response,
) {
  const operation = getIntegrationOperation(name)
  if (!operation || !getJournalContext()?.identity.integration)
    return unauthorized()
  const admission = await admitIntegrationRequest()
  if (admission.rejected) return admission.rejected
  const headers = new Headers(admission.headers)
  headers.set('Cache-Control', 'no-store')
  try {
    return respond(await runIntegrationOperation(operation, input), headers)
  } catch (error) {
    if (error instanceof ShottimerDisabledError) return unauthorized()
    const failure = describeIntegrationError(error)
    if (failure.code === 'invalid_input')
      return Response.json(
        { error: 'Expected {"seconds": <positive number>}' },
        { status: 400, headers },
      )
    return Response.json(
      { error: failure.message },
      { status: failure.status, headers },
    )
  }
}

/** `POST /api/shottimer/shots` from the device. */
export async function handleShottimerShotRequest(request: Request) {
  const body = await request.json().catch(() => null)
  return runDeviceOperation(
    'report_shot_time',
    body,
    (_, headers) => new Response(null, { status: 204, headers }),
  )
}

/** `GET /api/shottimer/target` from the device. */
export async function handleShottimerTargetRequest(_request: Request) {
  return runDeviceOperation('get_shot_target', {}, (result, headers) =>
    Response.json(result, { headers }),
  )
}
