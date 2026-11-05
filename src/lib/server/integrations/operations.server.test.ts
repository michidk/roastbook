import { describe, expect, test } from 'bun:test'
import { INTEGRATION_SCOPES } from '@/modules/integrations/scopes'
import { apiQueryInput, matchApiRoute } from './api.server'
import { toInputJsonSchema } from './input-schema.server'
import { buildOpenApiDocument } from './openapi.server'
import {
  getIntegrationOperation,
  INTEGRATION_OPERATIONS,
} from './operations.server'
import { rateLimitHeaders } from './rate-limit.server'

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
