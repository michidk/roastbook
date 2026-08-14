export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue }

export function toJsonValue(value: unknown): JsonValue {
  const seen = new WeakSet<object>()
  const serialized = JSON.stringify(value, (_key, entry: unknown) => {
    if (typeof entry === 'bigint') return entry.toString()
    if (entry instanceof Error) {
      return { name: entry.name, message: entry.message }
    }
    if (typeof entry === 'object' && entry !== null) {
      if (seen.has(entry)) return '[Circular]'
      seen.add(entry)
    }
    return entry
  })

  if (serialized === undefined) return null
  return JSON.parse(serialized) as JsonValue
}
