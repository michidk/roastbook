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
import { requiredScopes } from './runtime.server'

type JsonSchema = Record<string, unknown> & {
  properties?: Record<string, Record<string, unknown>>
  required?: string[]
}

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/Error' } },
  },
})

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

const JSON_SUCCESS = {
  description: 'Success',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { data: {} },
        required: ['data'],
      },
    },
  },
}

const IMAGE_SUCCESS = {
  description: 'The picture',
  content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
}

const ERROR_RESPONSES = {
  '400': errorResponse('Invalid input'),
  '401': errorResponse('Missing, unknown or expired key'),
  '403': errorResponse('The key lacks the required permission'),
  '404': errorResponse('Not found'),
  '405': errorResponse('The path does not support this method'),
  '409': errorResponse('The record changed or is in use'),
  '413': errorResponse('The request body is too large'),
  '415': errorResponse('Unsupported Content-Type'),
  '422': errorResponse('The journal refused the change'),
  '429': errorResponse('Rate limit reached; see Retry-After'),
  '500': errorResponse('Unexpected server error'),
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

/** One OpenAPI operation object. */
function operationDocument(operation: IntegrationOperation) {
  const pathParameters = [...operation.path.matchAll(/\{(\w+)\}/g)].map(
    (match) => match[1] as string,
  )
  const { $schema: _, ...schema } = toInputJsonSchema(
    operation.input.schema,
  ) as JsonSchema & { $schema?: string }
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
        operation.name === 'get_image' ? IMAGE_SUCCESS : JSON_SUCCESS,
      ...ERROR_RESPONSES,
    },
  }
}

/** OpenAPI 3.1 description of `/api/v1`, generated from the operation catalog. */
export function buildOpenApiDocument(origin: string) {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const operation of INTEGRATION_OPERATIONS) {
    const path = `/api/v1${operation.path}`
    paths[path] ??= {}
    paths[path][operation.method.toLowerCase()] = operationDocument(operation)
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
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: {
                  type: 'string',
                  enum: [
                    'unauthorized',
                    'invalid_input',
                    'insufficient_scope',
                    'not_found',
                    'conflict',
                    'operation_failed',
                    'rate_limited',
                    'server_error',
                  ],
                },
                message: { type: 'string' },
                scope: { type: 'string' },
                issues: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  }
}
