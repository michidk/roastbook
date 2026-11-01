const DATE_KEY = 'roastbookStoredDate'

/** RxDB documents are JSON; preserve dates before its object cloning runs. */
export function encodeStoredValue(value: unknown): unknown {
  if (value instanceof Date) return { [DATE_KEY]: value.toISOString() }
  if (Array.isArray(value)) return value.map(encodeStoredValue)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        encodeStoredValue(entry),
      ]),
    )
  return value
}

export function decodeStoredValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeStoredValue)
  if (value && typeof value === 'object') {
    if (
      DATE_KEY in value &&
      Object.keys(value).length === 1 &&
      typeof value[DATE_KEY] === 'string' &&
      !Number.isNaN(Date.parse(value[DATE_KEY]))
    )
      return new Date(value[DATE_KEY])
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        decodeStoredValue(entry),
      ]),
    )
  }
  return value
}
