import '@tanstack/react-start/server-only'
import type { z } from 'zod'
import { requireIdentity } from '@/db/journal-context.server'
import { encodeBase64 } from '@/lib/base64'
import { DEMO_MODE } from '@/lib/build-mode'
import { MAX_IMAGE_BYTES } from '@/lib/domain-contracts'
import { readBoundedRequestBody } from '../request-body.server'
import {
  type API_TRY_BASE_PATH,
  handleApiDocsRequest,
  isApiDocsPath,
} from './api-docs.server'
import { IntegrationImage } from './images.server'
import { buildOpenApiDocument } from './openapi.server'
import {
  INTEGRATION_OPERATIONS,
  type IntegrationOperation,
} from './operations.server'
import { loadIntegrationUsage } from './rate-limit.server'
import {
  admitIntegrationRequest,
  canUseOperation,
  describeIntegrationError,
  type IntegrationFailure,
  requireIntegration,
  runIntegrationOperation,
  toJson,
} from './runtime.server'

export const API_BASE_PATH = '/api/v1'
const MAX_JSON_BYTES = 1024 * 1024
// A base64 picture plus its JSON fields, or the same picture as multipart.
const MAX_UPLOAD_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64 * 1024

type Route = {
  operation: IntegrationOperation
  pattern: RegExp
  parameters: string[]
}

const routes: Route[] = INTEGRATION_OPERATIONS.map((operation) => {
  const parameters: string[] = []
  const pattern = operation.path.replace(/\{(\w+)\}/g, (_, name: string) => {
    parameters.push(name)
    return '([^/]+)'
  })
  return { operation, pattern: new RegExp(`^${pattern}$`), parameters }
})

export function matchApiRoute(method: string, path: string) {
  let pathMatched = false
  for (const route of routes) {
    const match = route.pattern.exec(path)
    if (!match) continue
    pathMatched = true
    if (route.operation.method !== method) continue
    const params = Object.fromEntries(
      route.parameters.map((name, index) => {
        const raw = match[index + 1] ?? ''
        let value = raw
        try {
          value = decodeURIComponent(raw)
        } catch {
          // Malformed escapes stay as sent and fail input validation.
        }
        return [name, /^\d{1,15}$/.test(value) ? Number(value) : value]
      }),
    )
    return { route, params }
  }
  return pathMatched ? 'method_not_allowed' : null
}

const noStore = { 'Cache-Control': 'private, no-store' }

function failure(failed: IntegrationFailure, headers?: Headers) {
  const responseHeaders = new Headers(headers)
  for (const [key, value] of Object.entries(noStore))
    responseHeaders.set(key, value)
  if (failed.code === 'insufficient_scope' && failed.scope)
    responseHeaders.set(
      'WWW-Authenticate',
      `Bearer error="insufficient_scope", scope="${failed.scope}"`,
    )
  const { status, ...error } = failed
  return Response.json({ error }, { status, headers: responseHeaders })
}

/** The zod schema of one object field, without optional/default wrappers. */
function fieldType(schema: z.ZodType, key: string): string | undefined {
  const def = schema._zod.def as unknown as {
    type: string
    shape?: Record<string, z.ZodType>
    innerType?: z.ZodType
    in?: z.ZodType
    element?: z.ZodType
  }
  if (def.type === 'object') {
    const field = def.shape?.[key]
    return field ? unwrapType(field) : undefined
  }
  if (def.type === 'pipe' && def.in) return fieldType(def.in, key)
  return undefined
}

function unwrapType(schema: z.ZodType): string {
  const def = schema._zod.def as unknown as {
    type: string
    innerType?: z.ZodType
    in?: z.ZodType
  }
  if (def.innerType) return unwrapType(def.innerType)
  if (def.type === 'pipe' && def.in) return unwrapType(def.in)
  return def.type
}

/** Query strings carry text; convert numbers and booleans the schema expects. */
export function apiQueryInput(schema: z.ZodType, search: URLSearchParams) {
  const input: Record<string, unknown> = {}
  for (const key of new Set(search.keys())) {
    const type = fieldType(schema, key)
    const values = search.getAll(key)
    const convert = (value: string) =>
      type === 'number' || type === 'int'
        ? value.trim() === ''
          ? undefined
          : Number(value)
        : type === 'boolean'
          ? value === 'true'
            ? true
            : value === 'false'
              ? false
              : value
          : value
    input[key] =
      type === 'array' ? values.map(convert) : convert(values.at(-1) ?? '')
  }
  return input
}

async function bodyInput(
  request: Request,
  operation: IntegrationOperation,
): Promise<Record<string, unknown> | Response> {
  const contentType =
    request.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? ''
  const limit =
    operation.name === 'upload_image' ? MAX_UPLOAD_BYTES : MAX_JSON_BYTES
  if (!request.body) return {}
  if (
    contentType === 'multipart/form-data' &&
    operation.name === 'upload_image'
  )
    return multipartUpload(request, limit)
  if (contentType && contentType !== 'application/json')
    return failure({
      status: 415,
      code: 'invalid_input',
      message: 'Send application/json (or multipart/form-data for pictures)',
    })
  const body = await readBoundedRequestBody(request, limit)
  if (body instanceof Response)
    return failure({
      status: body.status,
      code: 'invalid_input',
      message:
        body.status === 413
          ? 'The request body is too large'
          : 'Could not read the request body',
    })
  if (!body.length) return {}
  try {
    const value = JSON.parse(body.toString('utf8')) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Expected an object')
    return value as Record<string, unknown>
  } catch {
    return failure({
      status: 400,
      code: 'invalid_input',
      message: 'The request body must be a JSON object',
    })
  }
}

/** `entityType`, `entityId` and `file` fields, converted to the JSON shape. */
async function multipartUpload(request: Request, limit: number) {
  // Read with a bound first: chunked uploads carry no Content-Length.
  const body = await readBoundedRequestBody(request, limit)
  if (body instanceof Response)
    return failure({
      status: body.status,
      code: 'invalid_input',
      message:
        body.status === 413
          ? 'The picture is too large'
          : 'Could not read the form data',
    })
  let form: FormData
  try {
    form = await new Response(body, {
      headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    }).formData()
  } catch {
    return failure({
      status: 400,
      code: 'invalid_input',
      message: 'Could not read the form data',
    })
  }
  const file = form.get('file')
  if (!(file instanceof File))
    return failure({
      status: 400,
      code: 'invalid_input',
      message: 'Attach the picture as the "file" field',
    })
  if (file.size > MAX_IMAGE_BYTES)
    return failure({
      status: 413,
      code: 'invalid_input',
      message: 'The picture is too large',
    })
  return {
    entityType: form.get('entityType'),
    entityId: Number(form.get('entityId')),
    filename: file.name,
    mimeType: file.type,
    data: encodeBase64(new Uint8Array(await file.arrayBuffer())),
  }
}

function operationSummary(
  operation: IntegrationOperation,
  scopes: readonly string[],
) {
  return {
    name: operation.name,
    title: operation.title,
    method: operation.method,
    path: `${API_BASE_PATH}${operation.path}`,
    access: operation.access,
    resources: operation.resources,
    allowed: canUseOperation(operation, scopes),
  }
}

function withHeaders(response: Response, headers: Headers | undefined) {
  if (!headers) return response
  const merged = new Headers(response.headers)
  for (const [key, value] of headers) merged.set(key, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  })
}

/** Index and usage endpoints that do not map to an operation. */
async function builtInRoute(url: URL, path: string) {
  const integration = requireIntegration()
  if (path === '/')
    return Response.json(
      {
        data: {
          documentation: `${url.origin}${API_BASE_PATH}/openapi.json`,
          reference: `${url.origin}${API_BASE_PATH}/docs`,
          scopes: integration.scopes,
          operations: INTEGRATION_OPERATIONS.map((operation) =>
            operationSummary(operation, integration.scopes),
          ),
        },
      },
      { headers: noStore },
    )
  if (path === '/rate-limit') {
    const usage = await loadIntegrationUsage(requireIdentity().id, [
      integration.credentialId,
    ])
    return Response.json(
      {
        data: {
          ...usage.account,
          requestsTodayByThisKey:
            usage.requestsToday[integration.credentialId] ?? 0,
        },
      },
      { headers: noStore },
    )
  }
  return null
}

/** Query string, then body, then path parameters, which win on conflicts. */
async function operationInput(
  request: Request,
  url: URL,
  operation: IntegrationOperation,
  params: Record<string, unknown>,
) {
  let input: Record<string, unknown> = apiQueryInput(
    operation.input.schema,
    url.searchParams,
  )
  if (operation.method !== 'GET') {
    const body = await bodyInput(request, operation)
    if (body instanceof Response) return body
    input = { ...input, ...body }
  }
  return { ...input, ...params }
}

function operationResponse(operation: IntegrationOperation, result: unknown) {
  if (result instanceof IntegrationImage)
    return new Response(result.bytes as BodyInit, {
      headers: {
        ...noStore,
        'Content-Type': result.mimeType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  const created =
    operation.method === 'POST' && operation.name.startsWith('create_')
  return Response.json(
    { data: toJson(result) },
    { status: created ? 201 : 200, headers: noStore },
  )
}

async function routeRequest(request: Request, url: URL, path: string) {
  if (request.method === 'GET') {
    const response = await builtInRoute(url, path)
    if (response) return response
  }
  const matched = matchApiRoute(request.method, path)
  if (matched === null)
    return failure({
      status: 404,
      code: 'not_found',
      message: 'No such API route',
    })
  if (matched === 'method_not_allowed')
    return failure({
      status: 405,
      code: 'invalid_input',
      message: `${request.method} is not supported here`,
    })
  const { operation } = matched.route
  const input = await operationInput(request, url, operation, matched.params)
  if (input instanceof Response) return input
  try {
    return operationResponse(
      operation,
      await runIntegrationOperation(operation, input),
    )
  } catch (error) {
    return failure(describeIntegrationError(error))
  }
}

/**
 * `/api/v1`: the journal as a REST API. Runs inside the key owner's journal
 * scope (see request.server.ts); every route maps to one shared operation.
 * `/api/try/v1` serves the same routes to the signed-in API reference.
 */
export async function handleApiRequest(
  request: Request,
  basePath: typeof API_BASE_PATH | typeof API_TRY_BASE_PATH = API_BASE_PATH,
): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.slice(basePath.length) || '/'
  if (DEMO_MODE) return new Response('Not found', { status: 404 })
  const publicFiles = basePath === API_BASE_PATH && request.method === 'GET'
  if (publicFiles && path === '/openapi.json')
    return Response.json(buildOpenApiDocument(url.origin), {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  if (publicFiles && isApiDocsPath(path))
    return (
      (await handleApiDocsRequest(path)) ??
      failure({ status: 404, code: 'not_found', message: 'No such file' })
    )
  const admission = await admitIntegrationRequest()
  if (admission.rejected) return admission.rejected
  return withHeaders(await routeRequest(request, url, path), admission.headers)
}
