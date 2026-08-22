export type SearchRecord = Readonly<Record<string, unknown>>

export function searchValidator<Output extends object>(
  parse: (input: unknown) => Output,
) {
  return {
    types: undefined as unknown as {
      input: Partial<Output>
      output: Output
    },
    parse,
  }
}

export function searchRecord(value: unknown): SearchRecord {
  return typeof value === 'object' && value !== null
    ? (value as SearchRecord)
    : {}
}

export function searchString(
  value: unknown,
  fallback = '',
  maximumLength = 200,
): string {
  return typeof value === 'string' && value.length <= maximumLength
    ? value
    : fallback
}

export function searchInteger(
  value: unknown,
  fallback: number | undefined,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number | undefined {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback
}

export function searchEnum<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
  fallback: Values[number],
): Values[number] {
  return typeof value === 'string' && values.includes(value)
    ? (value as Values[number])
    : fallback
}

export function optionalSearchBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}
