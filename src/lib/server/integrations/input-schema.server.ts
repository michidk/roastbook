import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server'
import { z } from 'zod'

type Def = {
  type: string
  shape?: Record<string, z.ZodType>
  innerType?: z.ZodType
  in?: z.ZodType
  element?: z.ZodType
  options?: readonly z.ZodType[]
  left?: z.ZodType
  right?: z.ZodType
  valueType?: z.ZodType
}

const defOf = (schema: z.ZodType) => schema._zod.def as unknown as Def

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function reviveUnion(options: readonly z.ZodType[], value: unknown) {
  // A string another member accepts as a string stays a string.
  if (
    typeof value === 'string' &&
    options.some(
      (option) =>
        defOf(option).type !== 'date' && option.safeParse(value).success,
    )
  )
    return value
  return options.reduce<unknown>(
    (current, option) => reviveDates(option, current),
    value,
  )
}

function reviveObject(
  shape: Record<string, z.ZodType> | undefined,
  value: unknown,
) {
  if (!isPlainObject(value) || !shape) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      shape[key] ? reviveDates(shape[key], item) : item,
    ]),
  )
}

function reviveRecord(valueType: z.ZodType, value: unknown) {
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      reviveDates(valueType, item),
    ]),
  )
}

/**
 * JSON has no dates. Converts ISO strings to `Date` wherever the journal
 * schema expects one, leaving every other value untouched.
 */
export function reviveDates(schema: z.ZodType, value: unknown): unknown {
  const def = defOf(schema)
  switch (def.type) {
    case 'date': {
      if (typeof value !== 'string') return value
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date
    }
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'readonly':
    case 'catch':
    case 'nonoptional':
      return def.innerType ? reviveDates(def.innerType, value) : value
    case 'pipe':
      return def.in ? reviveDates(def.in, value) : value
    case 'array':
      return Array.isArray(value) && def.element
        ? value.map((item) => reviveDates(def.element as z.ZodType, item))
        : value
    case 'record':
      return def.valueType ? reviveRecord(def.valueType, value) : value
    case 'intersection':
      return def.left && def.right
        ? reviveDates(def.right, reviveDates(def.left, value))
        : value
    case 'union':
      return reviveUnion(def.options ?? [], value)
    case 'object':
      return reviveObject(def.shape, value)
    default:
      return value
  }
}

const jsonSchemaTargets = {
  'draft-07': 'draft-7',
  'draft-2020-12': 'draft-2020-12',
  'openapi-3.0': 'openapi-3.0',
} as const

/** The JSON Schema clients send; dates are ISO 8601 strings. */
export function toInputJsonSchema(
  schema: z.ZodType,
  target: keyof typeof jsonSchemaTargets = 'draft-2020-12',
) {
  return z.toJSONSchema(schema, {
    io: 'input',
    target: jsonSchemaTargets[target],
    unrepresentable: 'any',
    override: (context) => {
      if (defOf(context.zodSchema as unknown as z.ZodType).type === 'date') {
        context.jsonSchema.type = 'string'
        context.jsonSchema.format = 'date-time'
      }
    },
  }) as Record<string, unknown>
}

export type IntegrationInput = StandardSchemaWithJSON<unknown, unknown> & {
  readonly schema: z.ZodType
  /** Validates JSON input and returns it with dates revived, not transformed. */
  parse(value: unknown): unknown
}

/**
 * One input contract for the HTTP API and MCP tools. Validation uses the same
 * zod schema as the journal function; the journal function validates again
 * with its own rules, so the revived input is passed on unchanged.
 */
export function integrationInput(schema: z.ZodType): IntegrationInput {
  const validate = (value: unknown) => {
    const revived = reviveDates(schema, value ?? {})
    const result = schema.safeParse(revived)
    return result.success
      ? { value: revived }
      : {
          issues: result.error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path.filter(
              (key): key is string | number => typeof key !== 'symbol',
            ),
          })),
        }
  }
  const jsonSchema = (options: { target: string }) =>
    toInputJsonSchema(
      schema,
      options.target in jsonSchemaTargets
        ? (options.target as keyof typeof jsonSchemaTargets)
        : 'draft-2020-12',
    )
  return {
    schema,
    parse(value) {
      const result = validate(value)
      if (result.issues) throw new IntegrationInputError(result.issues)
      return result.value
    },
    '~standard': {
      version: 1,
      vendor: 'roastbook',
      validate,
      jsonSchema: { input: jsonSchema, output: jsonSchema },
    },
  }
}

export class IntegrationInputError extends Error {
  constructor(
    readonly issues: readonly {
      message: string
      path: readonly (string | number)[]
    }[],
  ) {
    super(
      issues
        .map((issue) =>
          issue.path.length
            ? `${issue.path.join('.')}: ${issue.message}`
            : issue.message,
        )
        .join('; ') || 'Invalid input',
    )
    this.name = 'IntegrationInputError'
  }
}
