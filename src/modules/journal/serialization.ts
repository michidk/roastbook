export function journalDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(journalDates)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      typeof child === 'string' &&
      /(?:At|Date|From)$/.test(key) &&
      /^\d{4}-\d{2}-\d{2}T/.test(child)
        ? new Date(child)
        : journalDates(child),
    ]),
  )
}

export function storedValues(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}
