import '@tanstack/react-start/server-only'
import {
  INTEGRATION_RESOURCES,
  INTEGRATION_SCOPES,
} from '@/modules/integrations/scopes'
import { toInputJsonSchema } from './input-schema.server'
import {
  INTEGRATION_OPERATIONS,
  type IntegrationOperation,
} from './operations.server'
import responseSchemas from './response-schemas.gen.json'
import { type IntegrationFailure, requiredScopes } from './runtime.server'

type JsonSchema = Record<string, unknown> & {
  properties?: Record<string, Record<string, unknown>>
  required?: string[]
}

function errorResponse(
  status: number,
  description: string,
  code: IntegrationFailure['code'] | 'unauthorized' | 'rate_limited',
) {
  const properties: Record<string, unknown> = {
    code: { type: 'string', const: code },
    message: { type: 'string' },
  }
  if (code === 'insufficient_scope') properties.scope = { type: 'string' }
  if (status === 400)
    properties.issues = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          path: { type: 'array', items: { type: ['string', 'number'] } },
        },
        required: ['message', 'path'],
      },
    }
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties,
              required: ['code', 'message'],
              additionalProperties: false,
            },
            ...(code === 'rate_limited'
              ? { rateLimit: responseSchemas.rateLimit }
              : {}),
          },
          required:
            code === 'rate_limited' ? ['error', 'rateLimit'] : ['error'],
          additionalProperties: false,
        },
        example: {
          error: {
            code,
            message: description,
            ...(code === 'insufficient_scope' ? { scope: 'brews:read' } : {}),
          },
          ...(code === 'rate_limited'
            ? {
                rateLimit: {
                  allowed: false,
                  windows: [
                    {
                      window: 'minute',
                      limit: 60,
                      used: 61,
                      remaining: 0,
                      resetAt: '2026-01-01T12:01:00.000Z',
                    },
                  ],
                },
              }
            : {}),
        },
      },
    },
  }
}

/** Splits path parameters off an input schema and keeps the rest. */
function withoutPathParameters(schema: JsonSchema, parameters: string[]) {
  if (!schema.properties) return schema
  const properties = Object.fromEntries(
    Object.entries(schema.properties).filter(
      ([key]) => !parameters.includes(key),
    ),
  )
  const required = schema.required?.filter((key) => !parameters.includes(key))
  return {
    ...schema,
    properties,
    ...(required?.length ? { required } : { required: undefined }),
  }
}

function jsonSuccess(operation: IntegrationOperation) {
  const schemas: Record<string, unknown> = responseSchemas.operations
  const data = schemas[operation.name]
  if (!data) throw new Error(`Missing response schema for ${operation.name}`)
  return {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { data },
          required: ['data'],
        },
      },
    },
  }
}

const IMAGE_SUCCESS = {
  description: 'The picture',
  content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
}

const ERROR_RESPONSES = {
  '400': errorResponse(400, 'Invalid input', 'invalid_input'),
  '401': errorResponse(401, 'Missing, unknown or expired key', 'unauthorized'),
  '403': errorResponse(
    403,
    'The key lacks the required permission',
    'insufficient_scope',
  ),
  '404': errorResponse(404, 'Not found', 'not_found'),
  '405': errorResponse(
    405,
    'The path does not support this method',
    'invalid_input',
  ),
  '409': errorResponse(409, 'The record changed or is in use', 'conflict'),
  '413': errorResponse(413, 'The request body is too large', 'invalid_input'),
  '415': errorResponse(415, 'Unsupported Content-Type', 'invalid_input'),
  '422': errorResponse(
    422,
    'The journal refused the change',
    'operation_failed',
  ),
  '429': errorResponse(
    429,
    'Rate limit reached; see Retry-After',
    'rate_limited',
  ),
  '500': errorResponse(500, 'Unexpected server error', 'server_error'),
}

function requestBody(operation: IntegrationOperation, body: JsonSchema) {
  if (operation.method === 'GET') return {}
  const multipart =
    operation.name === 'upload_image'
      ? {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                entityType: body.properties?.entityType,
                entityId: body.properties?.entityId,
                file: { type: 'string', format: 'binary' },
              },
              required: ['entityType', 'entityId', 'file'],
            },
          },
        }
      : {}
  return {
    requestBody: {
      required: operation.method !== 'DELETE',
      content: { 'application/json': { schema: body }, ...multipart },
    },
  }
}

function parametersOf(
  operation: IntegrationOperation,
  schema: JsonSchema,
  pathParameters: string[],
  rest: JsonSchema,
) {
  const query =
    operation.method === 'GET'
      ? Object.entries(rest.properties ?? {}).map(([name, property]) => ({
          name,
          in: 'query',
          required: rest.required?.includes(name) ?? false,
          schema: property,
        }))
      : []
  return [
    ...pathParameters.map((name) => ({
      name,
      in: 'path',
      required: true,
      schema: schema.properties?.[name] ?? { type: 'string' },
    })),
    ...query,
  ]
}

/** Schemas shared between operations, keyed by their definition. */
type SharedSchemas = {
  names: Map<string, string>
  schemas: Record<string, unknown>
}

const JSON_VALUE_TYPES = 'array,boolean,null,number,object,string'

function sharedSchemaName(
  key: string,
  definition: unknown,
  taken: ReadonlySet<string>,
) {
  const types = (definition as { anyOf?: { type?: string }[] }).anyOf
    ?.map((member) => member.type)
    .sort()
    .join(',')
  const base = !key.startsWith('__schema')
    ? key
    : types === JSON_VALUE_TYPES
      ? 'JsonValue'
      : 'Schema'
  let name = base
  for (let index = 2; taken.has(name); index++) name = `${base}${index}`
  return name
}

/**
 * Zod puts recursive schemas (such as `z.json()`) in a local `$defs` block,
 * but OpenAPI resolves `#/$defs/...` against the whole document. Moves them to
 * `components.schemas` and points the references there.
 */
function hoistDefinitions(schema: JsonSchema, shared: SharedSchemas) {
  const { $defs: definitions, ...rest } = schema as JsonSchema & {
    $defs?: Record<string, unknown>
  }
  if (!definitions) return schema
  const set = JSON.stringify(definitions)
  let text = JSON.stringify({ rest, definitions })
  const names: Record<string, string> = {}
  for (const [key, definition] of Object.entries(definitions)) {
    const known = shared.names.get(`${set}\u0000${key}`)
    names[key] =
      known ??
      sharedSchemaName(
        key,
        definition,
        new Set([
          'Error',
          ...Object.keys(shared.schemas),
          ...Object.values(names),
        ]),
      )
    shared.names.set(`${set}\u0000${key}`, names[key])
    text = text.replaceAll(
      JSON.stringify(`#/$defs/${key}`),
      JSON.stringify(`#/components/schemas/${names[key]}`),
    )
  }
  const hoisted = JSON.parse(text) as {
    rest: JsonSchema
    definitions: Record<string, unknown>
  }
  for (const [key, name] of Object.entries(names))
    shared.schemas[name] ??= hoisted.definitions[key]
  return hoisted.rest
}

/** One OpenAPI operation object. */
function operationDocument(
  operation: IntegrationOperation,
  shared: SharedSchemas,
) {
  const pathParameters = [...operation.path.matchAll(/\{(\w+)\}/g)].map(
    (match) => match[1] as string,
  )
  const { $schema: _, ...converted } = toInputJsonSchema(
    operation.input.schema,
  ) as JsonSchema & { $schema?: string }
  const schema = hoistDefinitions(converted, shared)
  const rest = withoutPathParameters(schema, pathParameters)
  const scopes = requiredScopes(operation)
  const created =
    operation.method === 'POST' && operation.name.startsWith('create_')
  return {
    operationId: operation.name,
    summary: operation.title,
    description: `${operation.description}\n\nRequires ${scopes.join(' and ')}.`,
    tags: [
      INTEGRATION_RESOURCES.find(
        (resource) => resource.id === operation.resources[0],
      )?.label ?? 'Pictures',
    ],
    // HTTP bearer schemes take no OAuth scopes; the API key's permissions are
    // listed in x-required-scopes ("a or b" means either one).
    security: [{ bearer: [] }],
    'x-required-scopes': scopes,
    parameters: parametersOf(operation, schema, pathParameters, rest),
    ...requestBody(operation, rest),
    responses: {
      [created ? '201' : '200']:
        operation.name === 'get_image' ? IMAGE_SUCCESS : jsonSuccess(operation),
      ...ERROR_RESPONSES,
    },
  }
}

/** OpenAPI 3.1 description of `/api/v1`, generated from the operation catalog. */
export function buildOpenApiDocument(origin: string) {
  const paths: Record<string, Record<string, unknown>> = {}
  const shared: SharedSchemas = { names: new Map(), schemas: {} }
  for (const operation of INTEGRATION_OPERATIONS) {
    const path = `/api/v1${operation.path}`
    paths[path] ??= {}
    paths[path][operation.method.toLowerCase()] = operationDocument(
      operation,
      shared,
    )
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Roastbook API',
      version: '1.0.0',
      description:
        'Your coffee journal over HTTP. Authenticate with an API key from Settings → API as `Authorization: Bearer <key>`. Every response carries RateLimit, RateLimit-Policy and X-RateLimit-* headers; `GET /api/v1/rate-limit` returns the current usage. Dates are ISO 8601 strings. Pictures are downloaded with `GET /api/v1/images?path=<storagePath>`.',
    },
    servers: [{ url: origin }],
    paths,
    components: {
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description: `Scopes: ${INTEGRATION_SCOPES.join(', ')}`,
        },
      },
      schemas: {
        ...shared.schemas,
        ...responseSchemas.definitions,
      },
    },
  }
}
