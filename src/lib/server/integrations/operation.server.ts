import '@tanstack/react-start/server-only'

import { z } from 'zod'
import { positiveIdSchema } from '@/lib/server-validation'
import { STATS_PERIOD_VALUES } from '@/lib/stats-filters'
import type {
  IntegrationAccess,
  IntegrationResource,
} from '@/modules/integrations/scopes'
import type { IntegrationImage } from './images.server'
import { type IntegrationInput, integrationInput } from './input-schema.server'

export type IntegrationContext = {
  /** Throws unless the credential holds this scope. */
  require(resource: IntegrationResource, access: IntegrationAccess): void
}

export type IntegrationOperation = {
  /** Stable: MCP tool name, OpenAPI operationId and owner tool switch. */
  readonly name: string
  readonly title: string
  readonly description: string
  readonly access: IntegrationAccess
  /**
   * The resources the operation touches. With one, the scope is checked before
   * the operation runs; with several, the operation checks the one it uses.
   */
  readonly resources: readonly IntegrationResource[]
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Path below `/api/v1`; `{name}` segments are taken from the input. */
  readonly path: string
  readonly input: IntegrationInput
  readonly run: (
    input: never,
    context: IntegrationContext,
  ) => Promise<unknown | IntegrationImage>
}

export const id = z.object({ id: positiveIdSchema })
export const empty = z.object({})
export const statsFilter = z.object({
  period: z.enum(STATS_PERIOD_VALUES).optional(),
  method: positiveIdSchema.optional().describe('Brewing method id'),
  bean: positiveIdSchema.optional().describe('Bean id'),
  from: z.iso.date().optional().describe('YYYY-MM-DD, with period=custom'),
  to: z.iso.date().optional().describe('YYYY-MM-DD, with period=custom'),
})

export function operation<S extends z.ZodType>(
  definition: Omit<IntegrationOperation, 'input' | 'run'> & {
    readonly input: S
    readonly run: (
      input: z.input<S>,
      context: IntegrationContext,
    ) => Promise<unknown>
  },
): IntegrationOperation {
  return {
    ...definition,
    input: integrationInput(definition.input),
    run: definition.run as IntegrationOperation['run'],
  }
}

type CrudOptions = {
  readonly resource: IntegrationResource
  readonly singular: string
  readonly plural: string
  readonly path: string
  readonly noun: string
}

/** The five standard operations for one journal collection. */
export function crud<
  L extends z.ZodType,
  C extends z.ZodType,
  U extends z.ZodType,
>(
  options: CrudOptions,
  handlers: {
    list: { input: L; run: (input: z.input<L>) => Promise<unknown> }
    get: (id: number) => Promise<unknown>
    create: { input: C; run: (input: z.input<C>) => Promise<unknown> }
    update: { input: U; run: (input: z.input<U>) => Promise<unknown> }
    delete: (id: number) => Promise<unknown>
  },
) {
  const { resource, singular, plural, path, noun } = options
  return [
    operation({
      name: `list_${plural}`,
      title: `List ${noun}s`,
      description: `Page through your ${noun}s.`,
      access: 'read',
      resources: [resource],
      method: 'GET',
      path,
      input: handlers.list.input,
      run: handlers.list.run,
    }),
    operation({
      name: `get_${singular}`,
      title: `Get ${noun}`,
      description: `Read one ${noun} with its details.`,
      access: 'read',
      resources: [resource],
      method: 'GET',
      path: `${path}/{id}`,
      input: id,
      run: (input) => handlers.get(input.id),
    }),
    operation({
      name: `create_${singular}`,
      title: `Create ${noun}`,
      description: `Add a ${noun} to your journal.`,
      access: 'write',
      resources: [resource],
      method: 'POST',
      path,
      input: handlers.create.input,
      run: handlers.create.run,
    }),
    operation({
      name: `update_${singular}`,
      title: `Update ${noun}`,
      description: `Replace the editable fields of a ${noun}.`,
      access: 'write',
      resources: [resource],
      method: 'PATCH',
      path: `${path}/{id}`,
      input: handlers.update.input,
      run: handlers.update.run,
    }),
    operation({
      name: `delete_${singular}`,
      title: `Delete ${noun}`,
      description: `Delete a ${noun} and its pictures.`,
      access: 'write',
      resources: [resource],
      method: 'DELETE',
      path: `${path}/{id}`,
      input: id,
      run: (input) => handlers.delete(input.id),
    }),
  ]
}
