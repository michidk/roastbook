import { describe, expect, spyOn, test } from 'bun:test'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { z } from 'zod'
import { DomainError } from '@/lib/domain-errors'
import { INTEGRATION_SCOPES } from '@/modules/integrations/scopes'
import { apiQueryInput, matchApiRoute } from './api.server'
import {
  API_TRY_BASE_PATH,
  handleApiDocsRequest,
  isApiDocsPath,
  isApiTryPath,
} from './api-docs.server'
import { toInputJsonSchema } from './input-schema.server'
import { buildOpenApiDocument } from './openapi.server'
import {
  getIntegrationOperation,
  INTEGRATION_OPERATIONS,
} from './operations.server'
import { rateLimitedResponse, rateLimitHeaders } from './rate-limit.server'
import responseSchemas from './response-schemas.gen.json'
import {
  describeIntegrationError,
  InsufficientScopeError,
} from './runtime.server'

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true })
addFormats(ajv)

function at(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((node, key) => {
    if (!node || typeof node !== 'object') throw new Error(`Missing ${key}`)
    return Reflect.get(node, key)
  }, value)
}

function responseValidator(path: string, method: string, status: number) {
  const document = buildOpenApiDocument('https://coffee.example')
  const pointer = path.replaceAll('~', '~0').replaceAll('/', '~1')
  return ajv.compile({
    components: document.components,
    paths: document.paths,
    $ref: `#/paths/${pointer}/${method}/responses/${status}/content/application~1json/schema`,
  })
}

describe('integration operation catalog', () => {
  test('names and routes are unique', () => {
    const names = INTEGRATION_OPERATIONS.map((operation) => operation.name)
    expect(new Set(names).size).toBe(names.length)
    const routes = INTEGRATION_OPERATIONS.map(
      (operation) => `${operation.method} ${operation.path}`,
    )
    expect(new Set(routes).size).toBe(routes.length)
    for (const name of names) expect(name).toMatch(/^[a-z][a-z_]{2,63}$/)
  })

  test('every scope unlocks at least one operation', () => {
    for (const scope of INTEGRATION_SCOPES) {
      const [resource, access] = scope.split(':')
      expect(
        INTEGRATION_OPERATIONS.some(
          (operation) =>
            operation.access === access &&
            operation.resources.some((item) => item === resource),
        ),
      ).toBe(true)
    }
  })

  test('path parameters are input fields, and every input has a JSON Schema', () => {
    for (const operation of INTEGRATION_OPERATIONS) {
      const json = toInputJsonSchema(operation.input.schema) as {
        type?: string
        properties?: Record<string, unknown>
      }
      expect(json.type).toBe('object')
      for (const [, name] of operation.path.matchAll(/\{(\w+)\}/g))
        expect(Object.keys(json.properties ?? {})).toContain(name as string)
    }
  })

  test('docs/api.md lists every operation under its scope', async () => {
    const docs = await Bun.file(
      new URL('../../../../docs/api.md', import.meta.url),
    ).text()
    const reference = docs.slice(
      docs.indexOf('## Permission reference'),
      docs.indexOf('## Requests'),
    )
    // One bullet per scope, continued on indented lines.
    const bullets = new Map(
      reference
        .split(/\n(?=- )/)
        .map((bullet) => bullet.replace(/\s+/g, ' '))
        .flatMap((bullet) => {
          const scope = /^- `([a-z]+:(?:read|write))`:/.exec(bullet)?.[1]
          return scope ? [[scope, bullet] as const] : []
        }),
    )
    // Operations spanning several resources share the pictures block.
    const picturesStart = reference.indexOf('Pictures need the scope')
    const picturesEnd = reference.indexOf('need\nno particular scope')
    expect(picturesStart).toBeGreaterThan(-1)
    expect(picturesEnd).toBeGreaterThan(picturesStart)
    const pictures = reference
      .slice(picturesStart, picturesEnd)
      .replace(/\s+/g, ' ')
    for (const operation of INTEGRATION_OPERATIONS) {
      const entry = `\`${operation.method} ${operation.path}\` (\`${operation.name}\`)`
      if (operation.resources.length === 1)
        expect(
          bullets.get(`${operation.resources[0]}:${operation.access}`) ?? '',
        ).toContain(entry)
      else expect(pictures).toContain(entry)
    }
  })

  test('reads never use write methods', () => {
    for (const operation of INTEGRATION_OPERATIONS)
      expect(operation.method === 'GET').toBe(operation.access === 'read')
  })
})

describe('REST routing', () => {
  test('matches templates and converts numeric path parameters', () => {
    const match = matchApiRoute('PATCH', '/beans/12/purchases/7')
    expect(match).not.toBeNull()
    expect(match).not.toBe('method_not_allowed')
    if (!match || match === 'method_not_allowed') return
    expect(match.route.operation.name).toBe('update_bean_purchase')
    expect(match.params).toEqual({ beanId: 12, id: 7 })
    expect(matchApiRoute('PUT', '/brews')).toBe('method_not_allowed')
    expect(matchApiRoute('GET', '/nope')).toBeNull()
    const list = matchApiRoute('GET', '/brews')
    expect(
      list && list !== 'method_not_allowed' && list.route.operation.name,
    ).toBe('list_brews')
  })

  test('converts query strings to the types the schema expects', () => {
    const operation = getIntegrationOperation('list_brews')
    if (!operation) throw new Error('missing list_brews')
    expect(
      apiQueryInput(
        operation.input.schema,
        new URLSearchParams('page=2&direction=asc&rating=4'),
      ),
    ).toEqual({ page: 2, direction: 'asc', rating: 4 })
  })

  test('publishes an OpenAPI 3.1 document for every operation', () => {
    const document = buildOpenApiDocument('https://coffee.example')
    expect(document.openapi).toBe('3.1.0')
    const operations = Object.values(document.paths).flatMap((methods) =>
      Object.values(methods as Record<string, { operationId: string }>),
    )
    expect(operations.map((operation) => operation.operationId).sort()).toEqual(
      INTEGRATION_OPERATIONS.map((operation) => operation.name).sort(),
    )
    expect(JSON.stringify(document)).not.toContain('"$schema"')
  })

  test('resolves every schema reference inside the OpenAPI document', () => {
    const document = buildOpenApiDocument('https://coffee.example')
    const text = JSON.stringify(document)
    expect(text).not.toContain('$defs')
    const references = [...text.matchAll(/"\$ref":"([^"]+)"/g)].map(
      (match) => match[1] as string,
    )
    expect(references).toContain('#/components/schemas/JsonValue')
    for (const reference of new Set(references)) {
      const target = reference
        .replace(/^#\//, '')
        .split('/')
        .reduce<unknown>(
          (node, key) => (node as Record<string, unknown> | undefined)?.[key],
          document,
        )
      expect(target, reference).toBeDefined()
    }
  })

  test('describes the success payload of every JSON operation', () => {
    expect(Object.keys(responseSchemas.operations).sort()).toEqual(
      INTEGRATION_OPERATIONS.filter(({ name }) => name !== 'get_image')
        .map(({ name }) => name)
        .sort(),
    )
    for (const operation of INTEGRATION_OPERATIONS) {
      if (operation.name === 'get_image') continue
      const status =
        operation.method === 'POST' && operation.name.startsWith('create_')
          ? 201
          : 200
      const validate = responseValidator(
        `/api/v1${operation.path}`,
        operation.method.toLowerCase(),
        status,
      )
      expect(validate({}), operation.name).toBe(false)
    }
    const validate = responseValidator(
      '/api/v1/gear/{entityId}/brews',
      'get',
      200,
    )
    expect(validate({ data: null })).toBe(false)
    expect(validate({ data: { items: [] } })).toBe(false)
    expect(
      validate({
        data: {
          scopeLabel: 'Grinder',
          page: 1,
          pageSize: 12,
          totalItems: 0,
          totalPages: 0,
          items: [],
        },
      }),
      JSON.stringify(validate.errors),
    ).toBe(true)
    expect(
      responseValidator('/api/v1/brews/{id}', 'delete', 200)({ data: null }),
    ).toBe(true)
    expect(
      responseValidator(
        '/api/v1/shottimer',
        'get',
        200,
      )({ data: { targetSeconds: null } }),
    ).toBe(true)
    expect(
      responseValidator(
        '/api/v1/shottimer',
        'get',
        200,
      )({ data: { targetSeconds: '30' } }),
    ).toBe(false)
  })

  test('error examples match their status and schema', () => {
    const expected = {
      400: 'invalid_input',
      401: 'unauthorized',
      403: 'insufficient_scope',
      404: 'not_found',
      405: 'invalid_input',
      409: 'conflict',
      413: 'invalid_input',
      415: 'invalid_input',
      422: 'operation_failed',
      429: 'rate_limited',
      500: 'server_error',
    }
    const document = buildOpenApiDocument('https://coffee.example')
    for (const [status, code] of Object.entries(expected)) {
      const content = at(
        document.paths,
        '/api/v1/brews',
        'get',
        'responses',
        status,
        'content',
        'application/json',
      )
      const example = at(content, 'example')
      expect(at(example, 'error', 'code')).toBe(code)
      const validate = responseValidator('/api/v1/brews', 'get', Number(status))
      expect(validate(example), JSON.stringify(validate.errors)).toBe(true)
      expect(
        validate({
          error: {
            code: code === 'server_error' ? 'unauthorized' : 'server_error',
            message: 'Wrong code',
          },
        }),
      ).toBe(false)
      const properties = at(
        content,
        'schema',
        'properties',
        'error',
        'properties',
      )
      expect(at(properties, 'scope') !== undefined).toBe(status === '403')
      expect(at(properties, 'issues') !== undefined).toBe(status === '400')
    }
  })

  test('runtime errors conform to their documented response schemas', async () => {
    const invalid = z.object({ id: z.number() }).safeParse({ id: 'bad' })
    if (invalid.success) throw new Error('Expected invalid input')
    const errors = [
      invalid.error,
      new InsufficientScopeError('brews:read'),
      new DomainError('validation', 'Invalid brew'),
      new DomainError('not_found', 'Brew not found'),
      new DomainError('conflict', 'Brew changed'),
      new Error('Bean not found'),
      new Error('This bean is in use'),
      new TypeError('Private implementation detail'),
    ]
    const logging = spyOn(console, 'error').mockImplementation(() => {})
    try {
      for (const error of errors) {
        const { status, ...payload } = describeIntegrationError(error)
        const validate = responseValidator('/api/v1/brews', 'get', status)
        expect(
          validate({ error: payload }),
          JSON.stringify(validate.errors),
        ).toBe(true)
      }
    } finally {
      logging.mockRestore()
    }
    const response = rateLimitedResponse({
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
    })
    const validate = responseValidator('/api/v1/brews', 'get', response.status)
    expect(
      validate(await response.json()),
      JSON.stringify(validate.errors),
    ).toBe(true)
  })

  test('keeps the API reference public and versioned with the bundle', () => {
    expect(isApiDocsPath('/docs')).toBe(true)
    expect(isApiDocsPath('/docs/scalar/1.0.0')).toBe(true)
    expect(isApiDocsPath('/docs/other')).toBe(false)
    expect(isApiDocsPath('/brews')).toBe(false)
  })

  test('serves only the installed Scalar bundle version', async () => {
    const manifest = new URL(
      '../../../../node_modules/@scalar/api-reference/package.json',
      import.meta.url,
    )
    const { version } = (await Bun.file(manifest).json()) as {
      version: string
    }
    const current = await handleApiDocsRequest(`/docs/scalar/${version}`)
    expect(current?.status).toBe(200)
    expect(current?.headers.get('Cache-Control')).toContain('immutable')
    expect(await handleApiDocsRequest('/docs/scalar/0.0.1')).toBeNull()
    expect(
      await handleApiDocsRequest(`/docs/scalar/${version}/../package.json`),
    ).toBeNull()
  })

  test('keeps signed-in test requests outside the public API prefix', () => {
    expect(isApiTryPath('/api/try/v1')).toBe(true)
    expect(isApiTryPath('/api/try/v1/brews')).toBe(true)
    expect(isApiTryPath('/api/try/v10/brews')).toBe(false)
    // Proxies let /api/v1/* through without a login; try requests need one.
    expect(API_TRY_BASE_PATH.startsWith('/api/v1')).toBe(false)
  })
})

describe('rate limit headers', () => {
  test('report every window and the tightest one', () => {
    const resetAt = new Date(Date.now() + 30_000).toISOString()
    const headers = rateLimitHeaders({
      allowed: false,
      windows: [
        { window: 'minute', limit: 120, used: 120, remaining: 0, resetAt },
        {
          window: 'day',
          limit: 5000,
          used: 300,
          remaining: 4700,
          resetAt: new Date(Date.now() + 3_600_000).toISOString(),
        },
      ],
    })
    expect(headers.get('RateLimit-Policy')).toBe(
      '"minute";q=120;w=60, "day";q=5000;w=86400',
    )
    expect(headers.get('RateLimit')).toMatch(
      /^"minute";r=0;t=\d+, "day";r=4700;t=\d+$/,
    )
    expect(headers.get('X-RateLimit-Limit')).toBe('120')
    expect(headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(Number(headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(Number(headers.get('Retry-After'))).toBeLessThanOrEqual(30)
  })
})
