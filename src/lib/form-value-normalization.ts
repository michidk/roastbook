export function blankToUndefined(value: string): string | undefined {
  return value.trim() ? value : undefined
}

export function blankToNull(value: string): string | null {
  return value.trim() ? value : null
}
