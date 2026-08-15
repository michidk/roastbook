import type { JsonValue } from '@/lib/json-value'

const ERROR_DETAIL_KEYS = [
  'code',
  'errno',
  'syscall',
  'hostname',
  'address',
  'port',
  'status',
  'type',
  'param',
] as const

const MAX_ERROR_DEPTH = 5

type ErrorRecord = Record<string, unknown>

function errorRecord(value: unknown): ErrorRecord | null {
  return typeof value === 'object' && value !== null
    ? (value as ErrorRecord)
    : null
}

function primitiveDetail(value: unknown): JsonValue | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value
  }
  return undefined
}

function serializeProviderError(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): JsonValue | undefined {
  const primitive = primitiveDetail(value)
  if (primitive !== undefined) return primitive
  if (depth >= MAX_ERROR_DEPTH || typeof value !== 'object' || value === null) {
    return undefined
  }
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const serialized = serializeProviderError(entry, seen, depth + 1)
      return serialized === undefined ? [] : [serialized]
    })
  }

  const result: Record<string, JsonValue> = {}
  for (const [key, entry] of Object.entries(value)) {
    const serialized = serializeProviderError(entry, seen, depth + 1)
    if (serialized !== undefined) result[key] = serialized
  }
  return result
}

function serializeError(
  error: unknown,
  seen: WeakSet<object>,
  depth: number,
): JsonValue {
  if (typeof error === 'string') return { message: error }

  const record = errorRecord(error)
  if (!record) return { message: 'Unknown error' }
  if (seen.has(record)) return { message: '[Circular error cause]' }
  seen.add(record)

  const result: Record<string, JsonValue> = {
    name: error instanceof Error ? error.name : 'Error',
    message:
      typeof record.message === 'string' && record.message.length > 0
        ? record.message
        : 'Unknown error',
  }

  for (const key of ERROR_DETAIL_KEYS) {
    const detail = primitiveDetail(record[key])
    if (detail !== undefined) result[key] = detail
  }

  if (record.error !== undefined) {
    const providerError = serializeProviderError(record.error, seen, depth + 1)
    if (providerError !== undefined) result.providerError = providerError
  }

  if (depth < MAX_ERROR_DEPTH && record.cause !== undefined) {
    result.cause = serializeError(record.cause, seen, depth + 1)
  }

  if (depth < MAX_ERROR_DEPTH && error instanceof AggregateError) {
    result.errors = error.errors.map((entry) =>
      serializeError(entry, seen, depth + 1),
    )
  }

  return result
}

export function aiErrorPayload(error: unknown): JsonValue {
  return serializeError(error, new WeakSet<object>(), 0)
}

function errorParts(error: unknown, depth = 0): Array<string> {
  if (depth >= MAX_ERROR_DEPTH) return []
  if (typeof error === 'string') return error.length > 0 ? [error] : []

  const record = errorRecord(error)
  if (!record) return []
  const message =
    typeof record.message === 'string' && record.message.length > 0
      ? record.message
      : null
  const code =
    typeof record.code === 'string' || typeof record.code === 'number'
      ? String(record.code)
      : null
  const current = message
    ? code && !message.includes(code)
      ? `${message} (${code})`
      : message
    : code
  const cause = errorParts(record.cause, depth + 1)

  return current ? [current, ...cause] : cause
}

export function aiErrorMessage(error: unknown): string {
  const uniqueParts = errorParts(error).filter(
    (part, index, parts) => index === 0 || part !== parts[index - 1],
  )
  return uniqueParts.length > 0 ? uniqueParts.join(': ') : 'Unknown error'
}
