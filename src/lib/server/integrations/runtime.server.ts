import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { requireIdentity } from '@/db/journal-context.server'
import { DomainError } from '@/lib/domain-errors'
import { touchIntegrationCredential } from '@/lib/server/auth/integrations.server'
import {
  hasScope,
  type IntegrationResource,
} from '@/modules/integrations/scopes'
import { IntegrationInputError } from './input-schema.server'
import type {
  IntegrationContext,
  IntegrationOperation,
} from './operations.server'
import {
  consumeIntegrationRequest,
  rateLimitedResponse,
  rateLimitHeaders,
} from './rate-limit.server'

export class InsufficientScopeError extends Error {
  constructor(readonly scope: string) {
    super(`This key needs the ${scope} permission`)
    this.name = 'InsufficientScopeError'
  }
}

/** The API key, MCP token or MCP application making the current request. */
export function requireIntegration() {
  const integration = requireIdentity().integration
  if (!integration) throw new Error('An integration credential is required')
  return integration
}

/** Whether a credential can use the operation at all (for discovery). */
export function canUseOperation(
  operation: IntegrationOperation,
  scopes: readonly string[],
) {
  return (
    operation.resources.some((resource) =>
      hasScope(scopes, resource, operation.access),
    ) && missingScopes(operation, scopes).length === 0
  )
}

/** Required scopes beyond the operation's resources that a credential lacks. */
export function missingScopes(
  operation: IntegrationOperation,
  scopes: readonly string[],
) {
  return (operation.alsoRequires ?? []).filter((scope) => {
    const [resource, access] = scope.split(':') as [
      IntegrationResource,
      'read' | 'write',
    ]
    return !hasScope(scopes, resource, access)
  })
}

/** Every scope a credential needs for the operation, for errors and docs. */
export function requiredScopes(operation: IntegrationOperation) {
  return [
    operation.resources
      .map((resource) => `${resource}:${operation.access}`)
      .join(' or '),
    ...(operation.alsoRequires ?? []),
  ]
}

/**
 * Validates input, checks the credential's scope, and runs the operation in
 * the owner's journal scope.
 */
export async function runIntegrationOperation(
  operation: IntegrationOperation,
  rawInput: unknown,
  scopes: readonly string[] = requireIntegration().scopes,
) {
  let checked = false
  const context: IntegrationContext = {
    require(resource: IntegrationResource, access) {
      if (!hasScope(scopes, resource, access))
        throw new InsufficientScopeError(`${resource}:${access}`)
      checked = true
    },
  }
  const [missing] = missingScopes(operation, scopes)
  if (missing) throw new InsufficientScopeError(missing)
  const [only] = operation.resources
  if (operation.resources.length === 1 && only)
    context.require(only, operation.access)
  else if (!canUseOperation(operation, scopes))
    throw new InsufficientScopeError(
      `${operation.resources[0] ?? 'brews'}:${operation.access}`,
    )
  const input = operation.input.parse(rawInput)
  const result = await operation.run(input as never, context)
  // Operations spanning several resources check the one they touched.
  if (!checked)
    throw new Error(`Operation ${operation.name} did not check its scope`)
  return result
}

/**
 * Counts the request against the account's allowance. Returns the response
 * to send instead when the limit is reached, and the headers for every reply.
 */
export async function admitIntegrationRequest() {
  const identity = requireIdentity()
  const integration = requireIntegration()
  const state = await consumeIntegrationRequest(
    identity.id,
    integration.credentialId,
  )
  if (!state.allowed) return { rejected: rateLimitedResponse(state), state }
  if (!integration.credentialId.startsWith('oauth:'))
    await touchIntegrationCredential(integration.credentialId).catch(
      (error: unknown) =>
        console.error('[Roastbook] recording key use failed', error),
    )
  return { rejected: null, state, headers: rateLimitHeaders(state) }
}

/** Dates become ISO strings; the shape is what the journal returned. */
export function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as unknown
}

export type IntegrationFailure = {
  status: number
  code:
    | 'invalid_input'
    | 'insufficient_scope'
    | 'not_found'
    | 'conflict'
    | 'operation_failed'
    | 'server_error'
  message: string
  issues?: readonly { message: string; path: readonly (string | number)[] }[]
  scope?: string
}

/**
 * Journal functions refuse changes with plain `Error`s written for people.
 * Subclasses (TypeError, driver and system errors) and errors carrying a code
 * or cause come from infrastructure and stay private.
 */
function isJournalMessage(error: unknown): error is Error {
  return (
    error instanceof Error &&
    Object.getPrototypeOf(error) === Error.prototype &&
    !('code' in error) &&
    error.cause === undefined &&
    error.message.length > 0 &&
    error.message.length <= 300
  )
}

/** Errors safe to show the caller; database and unknown errors stay private. */
export function describeIntegrationError(error: unknown): IntegrationFailure {
  if (error instanceof IntegrationInputError)
    return {
      status: 400,
      code: 'invalid_input',
      message: error.message,
      issues: error.issues,
    }
  if (error instanceof z.ZodError)
    return {
      status: 400,
      code: 'invalid_input',
      message: z.prettifyError(error),
      issues: error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path.filter(
          (key): key is string | number => typeof key !== 'symbol',
        ),
      })),
    }
  if (error instanceof InsufficientScopeError)
    return {
      status: 403,
      code: 'insufficient_scope',
      message: error.message,
      scope: error.scope,
    }
  if (error instanceof DomainError)
    return {
      status:
        error.code === 'not_found'
          ? 404
          : error.code === 'conflict'
            ? 409
            : 400,
      code:
        error.code === 'validation'
          ? 'invalid_input'
          : error.code === 'not_found'
            ? 'not_found'
            : 'conflict',
      message: error.message,
    }
  if (isJournalMessage(error)) {
    if (/not found/i.test(error.message))
      return { status: 404, code: 'not_found', message: error.message }
    return { status: 422, code: 'operation_failed', message: error.message }
  }
  console.error('[Roastbook] integration operation failed', error)
  return {
    status: 500,
    code: 'server_error',
    message: 'The operation failed. Try again later.',
  }
}
