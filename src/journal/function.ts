import { runJournalFunction } from '@/journal/platform/runtime'

type Validator =
  | { parse: (input: unknown) => unknown }
  | ((input: never) => unknown)
type Input<V> = V extends { _zod: { input: infer I } }
  ? I
  : V extends (input: infer I) => unknown
    ? I
    : never
type Output<V> = V extends { _zod: { output: infer O } }
  ? O
  : V extends (input: never) => infer O
    ? O
    : never

export type JournalKind = 'read' | 'write'
export type JournalFunctionInfo = {
  readonly name: string
  readonly kind: JournalKind
  /** Validates and runs the handler in the caller's journal scope. */
  readonly execute: (input: unknown) => Promise<unknown>
}
export type JournalFunction<In, Out> = ((
  ...options: undefined extends In
    ? [options?: { data?: In }]
    : [options: { data: In }]
) => Promise<Out>) & { readonly journal: JournalFunctionInfo }

const registry = new Map<string, JournalFunctionInfo>()

/** Every journal function that has been loaded, by `<module>/<export>` name. */
export function getJournalFunction(name: string) {
  return registry.get(name)
}

function define<In, Out>(
  kind: JournalKind,
  name: string,
  validator: Validator | undefined,
  handler: (context: { data: never }) => Out | Promise<Out>,
): JournalFunction<In, Awaited<Out>> {
  const validate = (input: unknown) =>
    validator === undefined
      ? input
      : typeof validator === 'function'
        ? validator(input as never)
        : validator.parse(input)
  const info: JournalFunctionInfo = {
    name,
    kind,
    execute: async (input) =>
      handler({ data: validate(input) as never }) as Promise<unknown>,
  }
  if (registry.has(name)) throw new Error(`Duplicate journal function ${name}`)
  registry.set(name, info)
  const call = (options?: { data?: unknown }) =>
    runJournalFunction(info, options?.data) as Promise<Awaited<Out>>
  return Object.assign(call, { journal: info }) as never
}

function builder(kind: JournalKind, name: string) {
  return {
    validator<V extends Validator>(validator: V) {
      return {
        handler<Out>(handler: (context: { data: Output<V> }) => Out) {
          return define<Input<V>, Out>(kind, name, validator, handler as never)
        },
      }
    },
    handler<Out>(handler: () => Out) {
      return define<undefined, Out>(kind, name, undefined, handler)
    },
  }
}

/**
 * Journal functions run against the local database in the browser and against
 * the server database. Reads never change data.
 */
export function journalRead(name: string) {
  return builder('read', name)
}

/** Writes are recorded in the browser outbox and replayed on the server by name. */
export function journalWrite(name: string) {
  return builder('write', name)
}
