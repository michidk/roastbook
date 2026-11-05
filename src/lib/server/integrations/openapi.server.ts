import '@tanstack/react-start/server-only'
import {
  INTEGRATION_RESOURCES,
  INTEGRATION_SCOPES,
} from '@/modules/integrations/scopes'
import { toInputJsonSchema } from './input-schema.server'
import { INTEGRATION_OPERATIONS } from './operations.server'

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

/** OpenAPI 3.1 description of `/api/v1`, generated from the operation catalog. */
export function buildOpenApiDocument(origin: string) {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const operation of INTEGRATION_OPERATIONS) {
    const parameters = [...operation.path.matchAll(/\{(\w+)\}/g)].map(
      (match) => match[1] as string,
    )
    const { $schema: _, ...schema } = toInputJsonSchema(
      operation.input.schema,
    ) as JsonSchema & { $schema?: string }
    const rest = withoutPathParameters(schema, parameters)
    const scopes =
      operation.resources.length === 1
        ? [`${operation.resources[0]}:${operation.access}`]
        : operation.resources.map(
            (resource) => `${resource}:${operation.access}`,
          )
    const query =
      operation.method === 'GET'
        ? Object.entries(rest.properties ?? {}).map(([name, property]) => ({
            name,
            in: 'query',
            required: rest.required?.includes(name) ?? false,
            schema: property,
          }))
        : []
    const success =
      operation.name === 'get_image'
        ? {
            description: 'The picture',
            content: {
              'image/*': { schema: { type: 'string', format: 'binary' } },
            },
          }
        : {
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
    const path = `/api/v1${operation.path}`
    paths[path] ??= {}
    paths[path][operation.method.toLowerCase()] = {
      operationId: operation.name,
      summary: operation.title,
      description: `${operation.description}\n\nRequires ${
        scopes.length === 1 ? scopes[0] : `one of ${scopes.join(', ')}`
      }.`,
      tags: [
        INTEGRATION_RESOURCES.find(
          (resource) => resource.id === operation.resources[0],
        )?.label ?? 'Pictures',
      ],
      security: [{ bearer: scopes }],
      parameters: [
        ...parameters.map((name) => ({
          name,
          in: 'path',
          required: true,
          schema: schema.properties?.[name] ?? { type: 'string' },
        })),
        ...query,
      ],
      ...(operation.method === 'GET'
        ? {}
        : {
            requestBody: {
              required: operation.method !== 'DELETE',
              content: {
                'application/json': { schema: rest },
                ...(operation.name === 'upload_image'
                  ? {
                      'multipart/form-data': {
                        schema: {
                          type: 'object',
                          properties: {
                            entityType: rest.properties?.entityType,
                            entityId: rest.properties?.entityId,
                            file: { type: 'string', format: 'binary' },
                          },
                          required: ['entityType', 'entityId', 'file'],
                        },
                      },
                    }
                  : {}),
              },
            },
          }),
      responses: {
        [operation.method === 'POST' && operation.name.startsWith('create_')
          ? '201'
          : '200']: success,
        '400': errorResponse('Invalid input'),
        '401': errorResponse('Missing, unknown or expired key'),
        '403': errorResponse('The key lacks the required permission'),
        '404': errorResponse('Not found'),
        '429': errorResponse('Rate limit reached; see Retry-After'),
      },
    }
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
